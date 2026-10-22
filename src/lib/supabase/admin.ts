import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente administrativo com SUPABASE_SERVICE_ROLE_KEY.
 * ATENÇÃO: NUNCA importe este arquivo em componentes do cliente ('use client').
 * Uso exclusivo em Server Actions e rotas de API protegidas no servidor.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.");
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
