import fs from "fs";

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  const envPath = fs.existsSync(".env.production")
    ? ".env.production"
    : fs.existsSync("/docker/cf-leads/.env.production")
    ? "/docker/cf-leads/.env.production"
    : ".env.local";

  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const k = match[1].trim();
        const v = match[2].trim().replace(/^['"]|['"]$/g, "");
        if (k === "NEXT_PUBLIC_SUPABASE_URL") supabaseUrl = v;
        if (k === "SUPABASE_SERVICE_ROLE_KEY") serviceRole = v;
      }
    }
  }
}

if (!supabaseUrl || !serviceRole) {
  console.error("Credenciais do Supabase não encontradas.");
  process.exit(1);
}

const TABLES = [
  "organizations",
  "profiles",
  "settings",
  "companies",
  "contacts",
  "leads",
  "weekly_batches",
  "batch_items",
  "attempts",
  "outcome_rules",
  "message_templates",
  "dedup_blocklist",
  "search_jobs",
  "audit_log",
];

async function run() {
  const dump = {
    exported_at: new Date().toISOString(),
    tables: {},
  };

  for (const table of TABLES) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
        headers: {
          apikey: serviceRole,
          Authorization: `Bearer ${serviceRole}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        dump.tables[table] = { error: `HTTP ${res.status}: ${res.statusText}` };
      } else {
        const data = await res.json();
        dump.tables[table] = data || [];
      }
    } catch (err) {
      dump.tables[table] = { error: err.message };
    }
  }

  process.stdout.write(JSON.stringify(dump, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
