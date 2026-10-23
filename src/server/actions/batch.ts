"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Retorna a data da segunda-feira da semana de uma data de referência (em formato YYYY-MM-DD).
 */
export async function getMondayOfWeek(d = new Date()): Promise<string> {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // ajusta quando domingo
  date.setDate(diff);
  return date.toISOString().split("T")[0];
}

/**
 * Verifica se existe algum lote anterior que ainda não foi revisado/fechado.
 */
export async function checkPendingReviewAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const currentMonday = await getMondayOfWeek();

  // Buscar lotes do usuário que estão abertos e cuja semana já passou
  const { data: pendingBatches } = await supabase
    .from("weekly_batches")
    .select("id, week_start, status")
    .eq("owner_id", user.id)
    .neq("status", "fechado")
    .lt("week_start", currentMonday)
    .order("week_start", { ascending: true })
    .limit(1);

  if (pendingBatches && pendingBatches.length > 0) {
    return { hasPending: true, batch: pendingBatches[0] };
  }

  return { hasPending: false };
}

/**
 * Busca sugestões de leads para compor o lote da semana.
 * Prioridade: Reentradas do ciclo 2 vencidas > novos não contatados.
 */
export async function getBatchSuggestionsAction(filters?: { niche?: string; city?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Perfil não encontrado." };

  // Buscar tamanho configurado do lote em settings (padrão 30)
  const { data: settings } = await supabase
    .from("settings")
    .select("batch_size")
    .eq("organization_id", profile.organization_id)
    .single();

  const batchSize = settings?.batch_size || 30;

  let query = supabase
    .from("leads")
    .select(`
      id,
      cycle,
      status,
      created_at,
      companies!inner (
        id,
        name,
        phone_e164,
        city,
        niche,
        contacts (
          name,
          is_decision_maker
        )
      )
    `)
    .eq("organization_id", profile.organization_id)
    .eq("status", "novo")
    .order("cycle", { ascending: false }) // ciclo 2 primeiro
    .order("created_at", { ascending: true })
    .limit(batchSize * 2);

  if (filters?.niche && filters.niche.trim()) {
    query = query.ilike("companies.niche", `%${filters.niche.trim()}%`);
  }
  if (filters?.city && filters.city.trim()) {
    query = query.ilike("companies.city", `%${filters.city.trim()}%`);
  }

  const { data: leads, error } = await query;
  if (error) return { error: error.message };

  return { leads: leads || [], batchSize };
}

/**
 * Confirma e ativa o lote de 30 leads para a semana.
 */
export async function confirmBatchAction(leadIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Perfil não encontrado." };

  if (!leadIds || leadIds.length === 0) {
    return { error: "Selecione pelo menos um lead para o lote." };
  }

  const currentMonday = await getMondayOfWeek();

  // 1. Criar ou buscar o lote da semana
  const { data: batch, error: batchError } = await supabase
    .from("weekly_batches")
    .upsert({
      organization_id: profile.organization_id,
      owner_id: user.id,
      week_start: currentMonday,
      status: "aberto",
    }, { onConflict: "owner_id, week_start" })
    .select()
    .single();

  if (batchError || !batch) {
    return { error: `Erro ao criar lote semanal: ${batchError?.message}` };
  }

  // 2. Inserir itens no lote
  const batchItems = leadIds.map((leadId) => ({
    batch_id: batch.id,
    lead_id: leadId,
  }));

  const { error: itemsError } = await supabase
    .from("batch_items")
    .upsert(batchItems, { onConflict: "batch_id, lead_id" });

  if (itemsError) {
    return { error: `Erro ao vincular itens no lote: ${itemsError.message}` };
  }

  // 3. Atualizar status dos leads para 'no_lote' e agendar primeira ação
  const now = new Date().toISOString();
  await supabase
    .from("leads")
    .update({
      status: "no_lote",
      next_action: "ligar",
      next_action_at: now,
      owner_id: user.id,
    })
    .in("id", leadIds);

  // 4. Registrar no audit_log
  await supabase.from("audit_log").insert({
    organization_id: profile.organization_id,
    user_id: user.id,
    action: "create_batch",
    entity: "weekly_batches",
    entity_id: batch.id,
    metadata: { lead_count: leadIds.length, week_start: currentMonday },
  });

  revalidatePath("/lote");
  revalidatePath("/hoje");
  revalidatePath("/leads");
  return { success: true, batchId: batch.id };
}

const batchReviewSchema = z.object({
  batchId: z.string().uuid(),
  destinations: z.record(
    z.string().uuid(),
    z.object({
      destination: z.enum(["oportunidade", "retorno_agendado", "encerrado_temporario", "encerrado_definitivo", "descartado"]),
      discardReason: z.string().optional(),
      scheduledReturnDate: z.string().optional(),
    })
  ),
});

/**
 * Conclui a Revisão Obrigatória de Sexta-feira:
 * Atribui destino a cada lead do lote e fecha o lote semanal.
 */
export async function submitBatchReviewAction(input: z.infer<typeof batchReviewSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Perfil não encontrado." };

  const parsed = batchReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { batchId, destinations } = parsed.data;

  // Buscar leads do lote para verificar o ciclo atual
  const leadIds = Object.keys(destinations);
  const { data: leads } = await supabase
    .from("leads")
    .select("id, cycle, company_id")
    .in("id", leadIds);

  const leadsMap = new Map((leads || []).map((l) => [l.id, l]));

  for (const [leadId, dest] of Object.entries(destinations)) {
    const lead = leadsMap.get(leadId);
    if (!lead) continue;

    // Atualizar batch_items
    await supabase
      .from("batch_items")
      .update({ destination: dest.destination })
      .eq("batch_id", batchId)
      .eq("lead_id", leadId);

    // Aplicar regras de transição de estado do lead
    if (dest.destination === "oportunidade") {
      await supabase.from("leads").update({
        status: "oportunidade",
        next_action: "reuniao",
      }).eq("id", leadId);

    } else if (dest.destination === "retorno_agendado") {
      const returnDate = dest.scheduledReturnDate
        ? new Date(dest.scheduledReturnDate)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await supabase.from("leads").update({
        status: "retorno_agendado",
        scheduled_return_at: returnDate.toISOString(),
        next_action: "ligar",
        next_action_at: returnDate.toISOString(),
      }).eq("id", leadId);

    } else if (dest.destination === "descartado") {
      await supabase.from("leads").update({
        status: "descartado",
        discard_reason: dest.discardReason || "Descartado na revisão de sexta",
        next_action: "nenhuma",
        next_action_at: null,
      }).eq("id", leadId);

    } else if (dest.destination === "encerrado_temporario") {
      // Regra de ouro: se o lead já estava no ciclo 2 e não falou com o decisor, vira encerrado_definitivo!
      if (lead.cycle >= 2) {
        // Encerramento definitivo via stored procedure com LGPD
        const pepper = process.env.DEDUP_PEPPER || "cfleads-secret-pepper-hash-dedup-2026";
        await supabase.rpc("close_lead_permanently", {
          p_lead_id: leadId,
          p_pepper: pepper,
        });
      } else {
        // Ciclo 1: 60 dias de repouso
        const reentryDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        await supabase.from("leads").update({
          status: "encerrado_temporario",
          reentry_at: reentryDate,
          next_action: "nenhuma",
          next_action_at: null,
        }).eq("id", leadId);
      }

    } else if (dest.destination === "encerrado_definitivo") {
      const pepper = process.env.DEDUP_PEPPER || "cfleads-secret-pepper-hash-dedup-2026";
      await supabase.rpc("close_lead_permanently", {
        p_lead_id: leadId,
        p_pepper: pepper,
      });
    }
  }

  // 4. Fechar o lote semanal
  await supabase
    .from("weekly_batches")
    .update({ status: "fechado" })
    .eq("id", batchId);

  // 5. Registrar no audit_log
  await supabase.from("audit_log").insert({
    organization_id: profile.organization_id,
    user_id: user.id,
    action: "close_batch_review",
    entity: "weekly_batches",
    entity_id: batchId,
    metadata: { reviewed_count: leadIds.length },
  });

  revalidatePath("/lote");
  revalidatePath("/hoje");
  revalidatePath("/leads");
  return { success: true };
}
