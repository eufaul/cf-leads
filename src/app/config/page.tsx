import { createClient } from "@/lib/supabase/server";
import { TopHeader } from "@/components/layout/TopHeader";
import { Settings, Sliders, MessageSquare, Zap, Shield } from "lucide-react";

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

  const { data: rules } = await supabase
    .from("outcome_rules")
    .select("*")
    .order("channel");

  const { data: templates } = await supabase
    .from("message_templates")
    .select("*");

  return (
    <div className="min-h-screen bg-slate-50">
      <TopHeader userEmail={user?.email} />

      <main className="max-w-4xl mx-auto p-4 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Configurações do Sistema</h1>
          <p className="text-xs text-slate-500">Parâmetros da prospecção, regras de próxima ação e templates</p>
        </div>

        {/* Parâmetros do Lote e Regras de Negócio */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Parâmetros da Semana de Prospecção</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-500 block">Tamanho do Lote Semanal</span>
              <p className="text-base font-bold text-slate-800">{settings?.batch_size || 30} leads</p>
              <span className="text-[10px] text-slate-400">Meta padrão de segunda-feira</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-500 block">Teto de Tentativas/Semana</span>
              <p className="text-base font-bold text-slate-800">{settings?.max_attempts_week || 5} tentativas</p>
              <span className="text-[10px] text-slate-400">Por lead antes de sugerir encerramento</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-500 block">Quarentena de Reentrada</span>
              <p className="text-base font-bold text-slate-800">{settings?.reentry_days || 60} dias</p>
              <span className="text-[10px] text-slate-400">Após encerrado temporário (Ciclo 2)</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-500 block">Retorno Padrão sem Data</span>
              <p className="text-base font-bold text-slate-800">Hoje + {settings?.default_return_days || 7} dias</p>
              <span className="text-[10px] text-slate-400">Proposta pelo sistema</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-500 block">Máximo de Remarcações</span>
              <p className="text-base font-bold text-slate-800">{settings?.max_reschedules || 3} vezes</p>
              <span className="text-[10px] text-slate-400">Após isso, sugere descarte</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-500 block">Fuso Horário Operacional</span>
              <p className="text-base font-bold text-slate-800">{settings?.timezone || "America/Sao_Paulo"}</p>
              <span className="text-[10px] text-slate-400">Horário de Brasília</span>
            </div>
          </div>
        </div>

        {/* Modelos de Mensagem */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Modelos de Mensagem (Templates)</h2>
          </div>

          <div className="space-y-3">
            {templates?.map((tpl) => (
              <div key={tpl.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">{tpl.name}</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {tpl.channel}
                  </span>
                </div>
                {tpl.subject && (
                  <p className="text-xs font-semibold text-slate-700">Assunto: {tpl.subject}</p>
                )}
                <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap font-sans">
                  {tpl.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
