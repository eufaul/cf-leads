import { createClient } from "@/lib/supabase/server";
import { TopHeader } from "@/components/layout/TopHeader";
import { ExportCsvButton } from "@/components/relatorios/ExportCsvButton";
import { BarChart3, TrendingUp, Users, Target, PhoneIncoming, AlertOctagon, Clock, CalendarDays } from "lucide-react";

export default async function RelatoriosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Buscar leads
  const { data: leads } = await supabase
    .from("leads")
    .select("id, status, discard_reason, created_at");

  // Buscar todas as tentativas com timestamp
  const { data: attempts } = await supabase
    .from("attempts")
    .select("id, channel, outcome, reached_decision_maker, occurred_at");

  const totalLeads = leads?.length || 0;
  const opportunities = leads?.filter((l) => l.status === "oportunidade").length || 0;
  const discarded = leads?.filter((l) => l.status === "descartado").length || 0;
  const inBatch = leads?.filter((l) => l.status === "no_lote").length || 0;

  const totalAttempts = attempts?.length || 0;
  const decisionMakerContacts = attempts?.filter((a) => a.reached_decision_maker).length || 0;
  const decisionMakerRate = totalAttempts > 0 ? Math.round((decisionMakerContacts / totalAttempts) * 100) : 0;
  const conversionRate = totalLeads > 0 ? Math.round((opportunities / totalLeads) * 100) : 0;

  // Análise por dia da semana (0: Dom, 1: Seg, 2: Ter, 3: Qua, 4: Qui, 5: Sex, 6: Sab)
  const daysMap: Record<number, { label: string; total: number; reached: number }> = {
    1: { label: "Segunda", total: 0, reached: 0 },
    2: { label: "Terça", total: 0, reached: 0 },
    3: { label: "Quarta", total: 0, reached: 0 },
    4: { label: "Quinta", total: 0, reached: 0 },
    5: { label: "Sexta", total: 0, reached: 0 },
  };

  let morningTotal = 0;
  let morningReached = 0;
  let afternoonTotal = 0;
  let afternoonReached = 0;

  attempts?.forEach((att) => {
    const d = new Date(att.occurred_at);
    const day = d.getDay();
    const hour = d.getHours();

    if (daysMap[day]) {
      daysMap[day].total++;
      if (att.reached_decision_maker) daysMap[day].reached++;
    }

    if (hour < 12) {
      morningTotal++;
      if (att.reached_decision_maker) morningReached++;
    } else {
      afternoonTotal++;
      if (att.reached_decision_maker) afternoonReached++;
    }
  });

  // Ranking de motivos de descarte
  const discardReasonsCount: Record<string, number> = {};
  leads?.forEach((l) => {
    if (l.status === "descartado" && l.discard_reason) {
      discardReasonsCount[l.discard_reason] = (discardReasonsCount[l.discard_reason] || 0) + 1;
    }
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <TopHeader userEmail={user?.email} />

      <main className="max-w-5xl mx-auto p-4 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Relatórios de Prospecção</h1>
            <p className="text-xs text-slate-500">Métricas de conversão, eficiência de contato e análise temporal</p>
          </div>
          <ExportCsvButton />
        </div>

        {/* Grade de KPIs Principais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-500" /> Total de Leads
            </span>
            <p className="text-2xl font-bold text-slate-900">{totalLeads}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" /> Taxa Decisor
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

        {/* Análise Temporal: Dias da Semana e Períodos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Taxa de Contato por Dia da Semana */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-800">Atendimento por Dia da Semana</h2>
            </div>
            <div className="space-y-2 text-xs">
              {Object.values(daysMap).map((d) => {
                const rate = d.total > 0 ? Math.round((d.reached / d.total) * 100) : 0;
                return (
                  <div key={d.label} className="space-y-1">
                    <div className="flex items-center justify-between text-slate-700">
                      <span>{d.label}</span>
                      <span className="font-semibold text-slate-900">
                        {rate}% ({d.reached}/{d.total} com decisor)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.max(rate, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Melhor Faixa Horária (Manhã vs Tarde) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-800">Taxa de Atendimento por Período</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                  Manhã (até 12h)
                </span>
                <p className="text-xl font-bold text-amber-900">
                  {morningTotal > 0 ? Math.round((morningReached / morningTotal) * 100) : 0}%
                </p>
                <span className="text-[10px] text-amber-700 block">
                  {morningReached} sucessos de {morningTotal} ligações
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1">
                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
                  Tarde (após 12h)
                </span>
                <p className="text-xl font-bold text-blue-900">
                  {afternoonTotal > 0 ? Math.round((afternoonReached / afternoonTotal) * 100) : 0}%
                </p>
                <span className="text-[10px] text-blue-700 block">
                  {afternoonReached} sucessos de {afternoonTotal} ligações
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 pt-1">
              O motor de regras usa esses dados para alternar automaticamente o horário das próximas tentativas.
            </p>
          </div>
        </div>

        {/* Volume de Tentativas e Motivos de Descarte */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-500" />
              Volume de Tentativas por Canal ({totalAttempts})
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
              Motivos de Descarte Registrados ({discarded})
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
