"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Atualiza o status de um lead diretamente no Pipeline Kanban.
 */
export async function updateLeadStatusAction(leadId: string, newStatus: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const validStatuses = [
    "novo",
    "no_lote",
    "retorno_agendado",
    "oportunidade",
    "descartado",
    "encerrado_temporario",
    "encerrado_definitivo",
  ];

  if (!validStatuses.includes(newStatus)) {
    return { error: "Status inválido." };
  }

  const { error } = await supabase
    .from("leads")
    .update({ status: newStatus as any })
    .eq("id", leadId);

  if (error) return { error: error.message };

  revalidatePath("/pipeline");
  revalidatePath("/leads");
  revalidatePath("/hoje");
  return { success: true };
}

const settingsSchema = z.object({
  batchSize: z.coerce.number().min(5).max(100),
  maxAttemptsWeek: z.coerce.number().min(1).max(20),
  reentryDays: z.coerce.number().min(15).max(365),
  defaultReturnDays: z.coerce.number().min(1).max(60),
  maxReschedules: z.coerce.number().min(1).max(10),
  timezone: z.string().default("America/Sao_Paulo"),
});

/**
 * Salva os parâmetros gerais da agência na tabela settings.
 */
export async function updateSystemSettingsAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Apenas administradores podem alterar as configurações." };
  }

  const raw = {
    batchSize: formData.get("batchSize"),
    maxAttemptsWeek: formData.get("maxAttemptsWeek"),
    reentryDays: formData.get("reentryDays"),
    defaultReturnDays: formData.get("defaultReturnDays"),
    maxReschedules: formData.get("maxReschedules"),
    timezone: formData.get("timezone") || "America/Sao_Paulo",
  };

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("settings")
    .update({
      batch_size: parsed.data.batchSize,
      max_attempts_week: parsed.data.maxAttemptsWeek,
      reentry_days: parsed.data.reentryDays,
      default_return_days: parsed.data.defaultReturnDays,
      max_reschedules: parsed.data.maxReschedules,
      timezone: parsed.data.timezone,
    })
    .eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };

  // Registrar em audit_log
  await supabase.from("audit_log").insert({
    organization_id: profile.organization_id,
    user_id: user.id,
    action: "update_settings",
    entity: "settings",
    metadata: parsed.data,
  });

  revalidatePath("/config");
  return { success: true };
}

const templateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "O nome do modelo é obrigatório"),
  channel: z.enum(["email", "whatsapp", "sms"]),
  subject: z.string().optional().nullable(),
  body: z.string().min(5, "O conteúdo da mensagem é obrigatório"),
});

/**
 * Cria ou edita um modelo de mensagem.
 */
export async function saveMessageTemplateAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Apenas administradores podem gerenciar modelos." };
  }

  const id = formData.get("id") as string;
  const raw = {
    id: id ? id : undefined,
    name: formData.get("name") as string,
    channel: formData.get("channel") as any,
    subject: (formData.get("subject") as string) || null,
    body: formData.get("body") as string,
  };

  const parsed = templateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (parsed.data.id) {
    const { error } = await supabase
      .from("message_templates")
      .update({
        name: parsed.data.name,
        channel: parsed.data.channel,
        subject: parsed.data.subject,
        body: parsed.data.body,
      })
      .eq("id", parsed.data.id)
      .eq("organization_id", profile.organization_id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("message_templates").insert({
      organization_id: profile.organization_id,
      name: parsed.data.name,
      channel: parsed.data.channel,
      subject: parsed.data.subject,
      body: parsed.data.body,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/config");
  return { success: true };
}

/**
 * Remove um modelo de mensagem.
 */
export async function deleteMessageTemplateAction(templateId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("message_templates")
    .delete()
    .eq("id", templateId);

  if (error) return { error: error.message };

  revalidatePath("/config");
  return { success: true };
}

/**
 * Exporta os leads da organização para CSV (Segurança: Restrito a Admin + Audit Log obrigatório).
 */
export async function exportLeadsCsvAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Apenas administradores têm permissão para exportar dados." };
  }

  const { data: leads, error } = await supabase
    .from("leads")
    .select(`
      id,
      status,
      cycle,
      next_action,
      next_action_at,
      discard_reason,
      created_at,
      companies (
        name,
        phone_e164,
        email,
        city,
        niche,
        website,
        cnpj,
        google_rating,
        google_reviews,
        contacts (
          name,
          role_title,
          is_decision_maker,
          phone_e164,
          email
        )
      )
    `)
    .eq("organization_id", profile.organization_id);

  if (error || !leads) {
    return { error: "Erro ao gerar exportação." };
  }

  // Registrar auditoria da exportação
  await supabase.from("audit_log").insert({
    organization_id: profile.organization_id,
    user_id: user.id,
    action: "export_leads_csv",
    entity: "leads",
    metadata: { rows_count: leads.length },
  });

  // Montar CSV com cabeçalho
  const headers = [
    "ID Lead",
    "Empresa",
    "Status",
    "Ciclo",
    "Telefone Principal",
    "E-mail",
    "Cidade",
    "Nicho",
    "Website",
    "CNPJ",
    "Avaliação Google",
    "Próxima Ação",
    "Data Próxima Ação",
    "Motivo Descarte",
    "Decisor Nome",
    "Decisor Telefone",
    "Data Cadastro",
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return "";
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = leads.map((l: any) => {
    const comp = l.companies;
    const dm = comp?.contacts?.find((c: any) => c.is_decision_maker);

    return [
      escapeCsv(l.id),
      escapeCsv(comp?.name),
      escapeCsv(l.status),
      escapeCsv(l.cycle),
      escapeCsv(comp?.phone_e164),
      escapeCsv(comp?.email),
      escapeCsv(comp?.city),
      escapeCsv(comp?.niche),
      escapeCsv(comp?.website),
      escapeCsv(comp?.cnpj),
      escapeCsv(comp?.google_rating),
      escapeCsv(l.next_action),
      escapeCsv(l.next_action_at),
      escapeCsv(l.discard_reason),
      escapeCsv(dm?.name),
      escapeCsv(dm?.phone_e164),
      escapeCsv(l.created_at),
    ].join(",");
  });

  // UTF-8 BOM (\uFEFF) para abrir com acentuação correta no Excel brasileiro
  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

  return { success: true, csvContent, filename: `cf-leads-export-${new Date().toISOString().split("T")[0]}.csv` };
}
