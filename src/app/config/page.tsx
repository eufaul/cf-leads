import { createClient } from "@/lib/supabase/server";
import { TopHeader } from "@/components/layout/TopHeader";
import { ApifyTokensManager } from "@/components/config/ApifyTokensManager";
import { SettingsEditor } from "@/components/config/SettingsEditor";
import { TemplatesEditor } from "@/components/config/TemplatesEditor";
import Link from "next/link";
import { User } from "lucide-react";

export default async function ConfigPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user?.id || "")
    .single();

  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .eq("organization_id", profile?.organization_id || "00000000-0000-0000-0000-000000000001")
    .single();

  const { data: templates } = await supabase
    .from("message_templates")
    .select("*")
    .order("created_at", { ascending: false });

  const apifyTokens = Array.isArray(settings?.apify_tokens)
    ? (settings.apify_tokens as any[])
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <TopHeader userEmail={user?.email} />

      <main className="max-w-4xl mx-auto p-4 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Configurações do Sistema</h1>
            <p className="text-xs text-slate-500">Parâmetros operacionais, pool de chaves Apify e templates de mensagem</p>
          </div>
          <Link
            href="/perfil"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs shrink-0"
          >
            <User className="w-4 h-4 text-blue-600" />
            <span>Editar Meu Perfil</span>
          </Link>
        </div>

        {/* Gerenciamento de Múltiplas Chaves da Apify (Pool com rotação) */}
        <ApifyTokensManager
          tokens={apifyTokens}
          envTokenExists={!!process.env.APIFY_TOKEN}
        />

        {/* Parâmetros Operacionais Editáveis */}
        <SettingsEditor settings={settings} />

        {/* Modelos de Mensagem Editáveis com inserção dinâmica de variáveis */}
        <TemplatesEditor initialTemplates={(templates as any) || []} />
      </main>
    </div>
  );
}
