"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const addTokenSchema = z.object({
  label: z.string().min(1, "Dê um nome para identificar a conta (ex: Conta 1)"),
  token: z.string().min(10, "Token inválido"),
});

export async function addApifyTokenAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Apenas administradores podem gerenciar chaves de integração." };
  }

  const raw = {
    label: (formData.get("label") as string)?.trim(),
    token: (formData.get("token") as string)?.trim(),
  };

  const parsed = addTokenSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data: settings } = await supabase
    .from("settings")
    .select("apify_tokens")
    .eq("organization_id", profile.organization_id)
    .single();

  const currentList = Array.isArray(settings?.apify_tokens) ? (settings.apify_tokens as any[]) : [];

  // Evitar duplicatas do mesmo token
  if (currentList.some((item) => (typeof item === "string" ? item : item?.token) === parsed.data.token)) {
    return { error: "Este token já está cadastrado no sistema." };
  }

  const updatedList = [
    ...currentList,
    {
      id: Math.random().toString(36).substring(7),
      label: parsed.data.label,
      token: parsed.data.token,
      created_at: new Date().toISOString(),
    },
  ];

  const { error: updateError } = await supabase
    .from("settings")
    .update({ apify_tokens: updatedList })
    .eq("organization_id", profile.organization_id);

  if (updateError) {
    return { error: `Erro ao salvar chave: ${updateError.message}` };
  }

  revalidatePath("/config");
  return { success: true };
}

export async function removeApifyTokenAction(tokenId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Apenas administradores podem gerenciar chaves de integração." };
  }

  const { data: settings } = await supabase
    .from("settings")
    .select("apify_tokens")
    .eq("organization_id", profile.organization_id)
    .single();

  const currentList = Array.isArray(settings?.apify_tokens) ? (settings.apify_tokens as any[]) : [];
  const updatedList = currentList.filter((item) => item.id !== tokenId);

  const { error: updateError } = await supabase
    .from("settings")
    .update({ apify_tokens: updatedList })
    .eq("organization_id", profile.organization_id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/config");
  return { success: true };
}
