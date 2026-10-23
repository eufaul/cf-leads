import { createClient } from "@/lib/supabase/server";
import { TopHeader } from "@/components/layout/TopHeader";
import { BarChart3, TrendingUp, Users, Target, PhoneIncoming, AlertOctagon } from "lucide-react";

export default async function RelatoriosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Buscar total de leads por status
  const { data: leads } = await supabase.from("leads").select("status, discard_reason");
  // Buscar tentativas
  const { data: attempts } = await supabase.from("attempts").select("channel, outcome, reached_decision_maker");

  const totalLeads = leads?.length || 0;
  const opportunities = leads?.filter((l) => l.status === "oportunidade").length || 0;
  const discarded = leads?.filter((l) => l.status === "descartado").length || 0;
  const inBatch = leads?.filter((l) => l.status === "no_lote").length || 0;

  const totalAttempts = attempts?.length || 0;
  const decisionMakerContacts = attempts?.filter((a) => a.reached_decision_maker).length || 0;
  const decisionMakerRate = totalAttempts > 0 ? Math.round((decisionMakerContacts / totalAttempts) * 100) : 0;
  const conversionRate = totalLeads > 0 ? Math.round((opportunities / totalLeads) * 100) : 0;

  // Motivos de descarte
  const discardReasonsCount: Record<string, number> = {};
  leads?.forEach((l) => {
    if (l.status === "descartado" && l.discard_reason) {
      discardReasonsCount[l.discard_reason] = (discardReasonsCount[l.discard_reason] || 0) + 1;
    }
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <TopHeader userEmail={user?.email} />

      <main className="max-w-4xl mx-auto p-4 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Relatórios de Prospecção</h1>
          <p className="text-xs text-slate-500">Métricas operacionais e taxas de conversão da C&F</p>
        </div>

        {/* Grade de Indicadores Principais (KPIs) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-500" /> Total de Leads
            </span>
            <p className="text-2xl font-bold text-slate-900">{totalLeads}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" /> Taxa com Decisor
            </span>
            <p className="text-2xl font-bold text-emerald-600">{decisionMakerRate}%</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-blue-600" /> Oportunidades
            </span>
            <p className="text-2xl font-bold text-blue-600">{opportunities}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-purple-500" /> Conversão Geral
            </span>
            <p className="text-2xl font-bold text-purple-600">{conversionRate}%</p>
          </div>
        </div>

        {/* Resumo de Tentativas e Motivos de Descarte */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-500" />
              Volume de Tentativas ({totalAttempts})
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <span className="text-slate-600">Ligações Realizadas</span>
                <span className="font-bold text-slate-900">
                  {attempts?.filter((a) => a.channel === "ligacao").length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <span className="text-slate-600">Mensagens de WhatsApp</span>
                <span className="font-bold text-slate-900">
                  {attempts?.filter((a) => a.channel === "whatsapp").length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <span className="text-slate-600">E-mails Enviados</span>
                <span className="font-bold text-slate-900">
                  {attempts?.filter((a) => a.channel === "email").length || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-500" />
              Motivos de Descarte ({discarded})
            </h2>
            {Object.keys(discardReasonsCount).length > 0 ? (
              <div className="space-y-2 text-xs">
                {Object.entries(discardReasonsCount).map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between p-2 rounded-lg bg-rose-50/50">
                    <span className="text-slate-700 truncate">{reason}</span>
                    <span className="font-bold text-rose-700">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Nenhum lead descartado até o momento.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
