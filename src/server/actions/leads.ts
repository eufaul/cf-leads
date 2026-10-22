"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { normalizePhoneE164 } from "@/lib/phone";
import { checkForDuplicates } from "@/lib/dedup";
import { calculateNextAction, Channel, Outcome } from "@/lib/rules-engine";
import { revalidatePath } from "next/cache";

const quickLeadSchema = z.object({
  name: z.string().min(2, "O nome da empresa deve ter pelo menos 2 caracteres"),
  phone: z.string().min(8, "Telefone é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  niche: z.string().min(2, "Nicho é obrigatório"),
  cnpj: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  decisionMakerName: z.string().optional().nullable(),
  decisionMakerPhone: z.string().optional().nullable(),
  decisionMakerEmail: z.string().optional().nullable(),
});

export async function createQuickLeadAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: "Perfil de usuário não encontrado." };
  }

  const raw = {
    name: formData.get("name") as string,
    phone: formData.get("phone") as string,
    city: formData.get("city") as string,
    niche: formData.get("niche") as string,
    cnpj: (formData.get("cnpj") as string) || null,
    website: (formData.get("website") as string) || null,
    decisionMakerName: (formData.get("decisionMakerName") as string) || null,
    decisionMakerPhone: (formData.get("decisionMakerPhone") as string) || null,
    decisionMakerEmail: (formData.get("decisionMakerEmail") as string) || null,
  };

  const parsed = quickLeadSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const phoneE164 = normalizePhoneE164(parsed.data.phone);
  if (!phoneE164) {
    return { error: "Número de telefone inválido. Informe DDD + número (ex: 19 99999-9999)." };
  }

  // Checagem antecipada de duplicatas
  const dupCheck = await checkForDuplicates(supabase, {
    organizationId: profile.organization_id,
    phone: phoneE164,
    cnpj: parsed.data.cnpj,
    website: parsed.data.website,
  });

  if (dupCheck.isDuplicate) {
    return { error: `Bloqueado: ${dupCheck.reason}` };
  }

  // 1. Inserir empresa
  const { data: company, error: compError } = await supabase
    .from("companies")
    .insert({
      organization_id: profile.organization_id,
      name: parsed.data.name,
      phone_e164: phoneE164,
      city: parsed.data.city,
      niche: parsed.data.niche,
      cnpj: parsed.data.cnpj,
      website: parsed.data.website,
      source: "manual",
    })
    .select()
    .single();

  if (compError || !company) {
    return { error: `Erro ao salvar empresa: ${compError?.message}` };
  }

  // 2. Inserir lead
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .insert({
      organization_id: profile.organization_id,
      company_id: company.id,
      owner_id: user.id,
      status: "novo",
      next_action: "ligar",
      next_action_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (leadError || !lead) {
    return { error: `Erro ao criar lead: ${leadError?.message}` };
  }

  // 3. Inserir decisor se informado
  if (parsed.data.decisionMakerName) {
    const contactPhone = parsed.data.decisionMakerPhone
      ? normalizePhoneE164(parsed.data.decisionMakerPhone) || phoneE164
      : phoneE164;

    await supabase.from("contacts").insert({
      organization_id: profile.organization_id,
      company_id: company.id,
      name: parsed.data.decisionMakerName,
      is_decision_maker: true,
      phone_e164: contactPhone,
      email: parsed.data.decisionMakerEmail,
    });
  }

  revalidatePath("/leads");
  revalidatePath("/hoje");
  return { success: true, leadId: lead.id };
}

const recordAttemptSchema = z.object({
  leadId: z.string().uuid(),
  channel: z.enum(["ligacao", "email", "whatsapp", "sms", "reuniao"]),
  outcome: z.string(),
  reachedDecisionMaker: z.boolean().default(false),
  notes: z.string().optional().nullable(),
  discardReason: z.string().optional().nullable(),
  customNextAction: z.enum(["ligar", "email", "whatsapp", "reuniao", "nenhuma"]).optional(),
  customNextActionDate: z.string().optional(),
});

export async function recordAttemptAction(input: z.infer<typeof recordAttemptSchema>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: "Perfil não encontrado." };
  }

  const parsed = recordAttemptSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Buscar histórico de tentativas anteriores para contar ocorrências
  const { data: prevAttempts } = await supabase
    .from("attempts")
    .select("outcome")
    .eq("lead_id", parsed.data.leadId)
    .order("occurred_at", { ascending: false });

  const consecutiveSameOutcome = prevAttempts
    ? prevAttempts.filter((a) => a.outcome === parsed.data.outcome).length + 1
    : 1;

  // Calcular próxima ação recomendada pelo motor de regras
  const ruleResult = calculateNextAction({
    channel: parsed.data.channel as Channel,
    outcome: parsed.data.outcome as Outcome,
    occurrenceCount: consecutiveSameOutcome,
  });

  const finalAction = parsed.data.customNextAction || ruleResult.nextAction;
  const finalDate = parsed.data.customNextActionDate
    ? new Date(parsed.data.customNextActionDate)
    : ruleResult.suggestedDate;

  // 1. Gravar a tentativa
  const { error: attError } = await supabase.from("attempts").insert({
    organization_id: profile.organization_id,
    lead_id: parsed.data.leadId,
    user_id: user.id,
    channel: parsed.data.channel,
    outcome: parsed.data.outcome as any,
    reached_decision_maker: parsed.data.reachedDecisionMaker,
    notes: parsed.data.notes,
    suggested_action: ruleResult.suggestedActionLabel,
    suggested_at: ruleResult.suggestedDate.toISOString(),
  });

  if (attError) {
    return { error: `Erro ao registrar tentativa: ${attError.message}` };
  }

  // 2. Atualizar o estado do Lead
  const updatePayload: any = {
    next_action: finalAction,
    next_action_at: finalDate.toISOString(),
  };

  if (ruleResult.resultingStatus) {
    updatePayload.status = ruleResult.resultingStatus;
  }

  if (parsed.data.reachedDecisionMaker) {
    updatePayload.last_decision_maker_contact_at = new Date().toISOString();
  }

  if (parsed.data.outcome === "decisor_sem_interesse") {
    updatePayload.status = "descartado";
    updatePayload.discard_reason = parsed.data.discardReason || parsed.data.notes || "Sem interesse";
    updatePayload.next_action = "nenhuma";
  }

  if (parsed.data.outcome === "opt_out") {
    updatePayload.status = "descartado";
    updatePayload.opt_out_at = new Date().toISOString();
    updatePayload.discard_reason = "Opt-out solicitado pelo cliente";
    updatePayload.next_action = "nenhuma";
  }

  await supabase.from("leads").update(updatePayload).eq("id", parsed.data.leadId);

  // Se o número for inválido, marcar na empresa
  if (parsed.data.outcome === "numero_invalido") {
    const { data: lead } = await supabase
      .from("leads")
      .select("company_id")
      .eq("id", parsed.data.leadId)
      .single();
    if (lead) {
      await supabase.from("companies").update({ phone_invalid: true }).eq("id", lead.company_id);
    }
  }

  revalidatePath("/hoje");
  revalidatePath("/leads");
  revalidatePath(`/leads/${parsed.data.leadId}`);

  return { success: true };
}
