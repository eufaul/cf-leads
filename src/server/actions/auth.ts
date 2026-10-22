"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { redirect } from "next/navigation";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
});

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Credenciais inválidas. Verifique seu e-mail e senha." };
  }

  // Verificar se o usuário possui MFA configurado
  const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (mfaData && mfaData.nextLevel === "aal2" && mfaData.currentLevel !== "aal2") {
    return { requiresMFA: true };
  }

  // Registrar login no audit_log
  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile) {
      await supabase.from("audit_log").insert({
        organization_id: profile.organization_id,
        user_id: data.user.id,
        action: "login",
        entity: "auth",
        metadata: { email: data.user.email },
      });
    }
  }

  redirect("/hoje");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
