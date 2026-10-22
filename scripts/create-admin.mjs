import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Ler .env.local
const envContent = fs.readFileSync(".env.local", "utf8");
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
  console.error("Variáveis de ambiente ausentes no .env.local");
  process.exit(1);
}

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim(), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = process.argv[2] || "cadastros@agenciacf.com.br";
const password = process.argv[3] || "AgenciaCF2026!#";
const fullName = process.argv[4] || "Faul — Agência C&F";

async function createAdmin() {
  console.log(`Criando ou vinculando usuário admin: ${email}...`);

  // 1. Criar usuário no auth.users via admin API
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId = userData?.user?.id;

  if (userError) {
    if (userError.message.includes("already registered")) {
      console.log("Usuário já existe no Auth. Buscando ID...");
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email === email);
      if (existing) {
        userId = existing.id;
      }
    } else {
      console.error("Erro ao criar usuário:", userError.message);
      process.exit(1);
    }
  }

  if (!userId) {
    console.error("Não foi possível obter o ID do usuário.");
    process.exit(1);
  }

  // 2. Criar ou atualizar perfil na tabela profiles vinculando à Agência C&F
  const orgId = "00000000-0000-0000-0000-000000000001";
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    organization_id: orgId,
    full_name: fullName,
    role: "admin",
    active: true,
  });

  if (profileError) {
    console.error("Erro ao vincular perfil de admin:", profileError.message);
    process.exit(1);
  }

  console.log("Sucesso! Perfil de administrador ativo e vinculado.");
  console.log(`E-mail: ${email}`);
  console.log(`ID do Usuário: ${userId}`);
}

createAdmin();
