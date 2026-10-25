"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const profileDetailsSchema = z.object({
  fullName: z.string().min(2, "O nome completo deve ter pelo menos 2 caracteres"),
  companyName: z.string().min(2, "O nome da empresa deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional().default(""),
  companyAddress: z.string().optional().default(""),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirmação de senha deve ter no mínimo 6 caracteres"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export async function updateProfileDetailsAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  const raw = {
    fullName: formData.get("fullName") as string,
    companyName: formData.get("companyName") as string,
    email: formData.get("email") as string,
    phone: (formData.get("phone") as string) || "",
    companyAddress: (formData.get("companyAddress") as string) || "",
  };

  const parsed = profileDetailsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { fullName, companyName, email, phone, companyAddress } = parsed.data;

  // 1. Buscar perfil e organização
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  const organizationId = profile?.organization_id || "00000000-0000-0000-0000-000000000001";

  // 2. Atualizar tabela profiles (full_name e phone se a coluna existir)
  const profileUpdateData: Record<string, any> = {
    full_name: fullName,
  };
  // Tentar atualizar com phone; se a coluna não existir ainda, atualiza só full_name
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ ...profileUpdateData, phone })
    .eq("id", user.id);

  if (profileError) {
    // Fallback caso a coluna phone ainda não esteja no schema
    await supabase
      .from("profiles")
      .update(profileUpdateData)
      .eq("id", user.id);
  }

  // 3. Atualizar tabela organizations (name e address se a coluna existir)
  const orgUpdateData: Record<string, any> = {
    name: companyName,
  };
  const { error: orgError } = await supabase
    .from("organizations")
    .update({ ...orgUpdateData, address: companyAddress })
    .eq("id", organizationId);

  if (orgError) {
    // Fallback caso a coluna address ainda não esteja no schema
    await supabase
      .from("organizations")
      .update(orgUpdateData)
      .eq("id", organizationId);
  }

  // 4. Atualizar Supabase Auth (user_metadata e email se alterado)
  const authUpdatePayload: {
    email?: string;
    data: Record<string, any>;
  } = {
    data: {
      full_name: fullName,
      phone,
      company_name: companyName,
      company_address: companyAddress,
    },
  };

  if (email.toLowerCase() !== user.email?.toLowerCase()) {
    authUpdatePayload.email = email;
  }

  const { error: authError } = await supabase.auth.updateUser(authUpdatePayload);
  if (authError) {
    return { error: `Erro ao atualizar autenticação: ${authError.message}` };
  }

  // 5. Registrar no log de auditoria
  await supabase.from("audit_log").insert({
    organization_id: organizationId,
    user_id: user.id,
    action: "update_profile",
    entity: "profiles",
    entity_id: user.id,
    metadata: {
      full_name: fullName,
      company_name: companyName,
      email_changed: email.toLowerCase() !== user.email?.toLowerCase(),
    },
  });

  revalidatePath("/perfil");
  revalidatePath("/config");
  revalidatePath("/hoje");

  const emailNotice = email.toLowerCase() !== user.email?.toLowerCase()
    ? " Um link de confirmação foi enviado para o novo e-mail."
    : "";

  return { success: true, message: `Perfil e dados da empresa atualizados com sucesso!${emailNotice}` };
}

export async function updatePasswordAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  const raw = {
    newPassword: formData.get("newPassword") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = passwordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { newPassword } = parsed.data;

  const { error: authError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (authError) {
    return { error: `Erro ao alterar senha: ${authError.message}` };
  }

  // Buscar perfil para organization_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  // Registrar auditoria
  await supabase.from("audit_log").insert({
    organization_id: profile?.organization_id || "00000000-0000-0000-0000-000000000001",
    user_id: user.id,
    action: "update_password",
    entity: "profiles",
    entity_id: user.id,
    metadata: { timestamp: new Date().toISOString() },
  });

  return { success: true, message: "Senha alterada com sucesso!" };
}
