"use client";

import { useState } from "react";
import { confirmBatchAction, submitBatchReviewAction } from "@/server/actions/batch";
import { Layers, CheckCircle2, AlertTriangle, Sparkles, User, MapPin, Building2, Phone, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface BatchPlannerProps {
  currentBatch: any | null;
  pendingReviewBatch: any | null;
  suggestedLeads: any[];
  batchSize: number;
  todayIsFridayOrWeekend: boolean;
}

export function BatchPlanner({
  currentBatch,
  pendingReviewBatch,
  suggestedLeads,
  batchSize,
  todayIsFridayOrWeekend,
}: BatchPlannerProps) {
  const router = useRouter();
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>(
    suggestedLeads.slice(0, batchSize).map((l) => l.id)
  );
  const [destinations, setDestinations] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lote a ser revisado (pode ser o pendente de semana anterior ou o atual se for sexta)
  const batchToReview = pendingReviewBatch || (todayIsFridayOrWeekend && currentBatch ? currentBatch : null);

  // 1. MODO REVISÃO OBRIGATÓRIA
  if (batchToReview) {
    const items = batchToReview.batch_items || [];
    const allAssigned = items.length > 0 && items.every((i: any) => destinations[i.lead_id]?.destination);

    async function handleReviewSubmit() {
      if (!allAssigned) return;
      setLoading(true);
      setError(null);

      const result = await submitBatchReviewAction({
        batchId: batchToReview.id,
        destinations,
      });

      if (result.error) {
        setError(result.error);
        setLoading(false);
      } else {
        router.refresh();
      }
    }

    return (
      <div className="space-y-4">
        {pendingReviewBatch && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-amber-900">Revisão Pendente Obrigatória</h3>
              <p className="text-xs text-amber-800">
                O lote anterior da semana de{" "}
                <strong>{new Date(batchToReview.week_start).toLocaleDateString("pt-BR")}</strong> precisa de destino para cada lead antes de abrir o novo lote.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Revisão Semanal de Leads</h2>
              <p className="text-xs text-slate-500">
                Atribua o destino final de cada lead trabalhado no lote ({items.length} leads).
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {Object.keys(destinations).length} / {items.length} definidos
            </span>
          </div>

          {error && (
            <div className="p-3 text-xs rounded-xl bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {items.map((item: any, idx: number) => {
              const lead = item.leads;
              const comp = lead?.companies;
              const currentDest = destinations[item.lead_id]?.destination;

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                      <h4 className="text-sm font-bold text-slate-900">{comp?.name}</h4>
                      <p className="text-xs text-slate-500">{comp?.city} • {comp?.niche}</p>
                    </div>
                    {lead?.cycle >= 2 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        Ciclo 2
                      </span>
                    )}
                  </div>

                  {/* Seleção do Destino */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                    {[
                      { id: "oportunidade", label: "Oportunidade", bg: "hover:bg-emerald-50 text-emerald-800 border-emerald-300" },
                      { id: "retorno_agendado", label: "Retorno Agendado", bg: "hover:bg-amber-50 text-amber-800 border-amber-300" },
                      { id: "encerrado_temporario", label: lead?.cycle >= 2 ? "Encerrar Definitivo" : "Encerrar (60 dias)", bg: "hover:bg-purple-50 text-purple-800 border-purple-300" },
                      { id: "descartado", label: "Descartado", bg: "hover:bg-rose-50 text-rose-800 border-rose-300" },
                    ].map((btn) => {
                      const isSel = currentDest === btn.id;
                      return (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() =>
                            setDestinations((prev) => ({
                              ...prev,
                              [item.lead_id]: { destination: btn.id },
                            }))
                          }
                          className={`p-2 rounded-lg border font-medium text-center transition-all ${
                            isSel
                              ? "bg-blue-600 text-white font-bold border-blue-600 shadow-xs"
                              : `bg-white ${btn.bg}`
                          }`}
                        >
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={!allAssigned || loading}
              onClick={handleReviewSubmit}
              className="w-full py-3 px-4 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-md disabled:opacity-50"
            >
              {loading ? "Fechando Lote..." : "Concluir Revisão e Fechar Semana"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. MODO LOTE ATIVO EM ANDAMENTO
  if (currentBatch && currentBatch.status === "aberto") {
    const items = currentBatch.batch_items || [];
    return (
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Lote em Execução
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Semana de {new Date(currentBatch.week_start).toLocaleDateString("pt-BR")}
              </h2>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800">
              {items.length} Leads no Lote
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Trabalhe estes leads ao longo da semana através da aba <strong>Hoje</strong>. Na sexta-feira, você fará a revisão obrigatória de cada um.
          </p>

          <div className="divide-y divide-slate-100">
            {items.map((it: any, idx: number) => {
              const lead = it.leads;
              const comp = lead?.companies;
              return (
                <div key={it.id} className="py-2.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                      <Link href={`/leads/${lead?.id}`} className="text-xs font-bold text-slate-800 hover:text-blue-600">
                        {comp?.name}
                      </Link>
                    </div>
                    <span className="text-[11px] text-slate-500">{comp?.city} • {comp?.niche}</span>
                  </div>
                  <Link
                    href={`/leads/${lead?.id}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <Link
              href="/hoje"
              className="w-full py-3 px-4 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <Phone className="w-4 h-4" />
              <span>Ir para a Fila do Dia (Hoje)</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. MODO MONTAGEM DO NOVO LOTE (Segunda-feira / Novo Lote)
  function toggleLead(id: string) {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleConfirmBatch() {
    if (selectedLeadIds.length === 0) return;
    setLoading(true);
    setError(null);

    const result = await confirmBatchAction(selectedLeadIds);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.refresh();
      router.push("/hoje");
    }
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Montagem do Lote da Semana</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Sugestão de {batchSize} Leads para a Semana
        </h2>
        <p className="text-xs text-slate-500">
          O sistema prioriza automaticamente empresas do ciclo 2 que completaram 60 dias de repouso e empresas novas nunca contatadas.
        </p>

        {error && (
          <div className="p-3 text-xs rounded-xl bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="font-semibold text-slate-700">
            Selecionados: <strong className="text-blue-600">{selectedLeadIds.length}</strong> de {batchSize}
          </span>
          <button
            type="button"
            onClick={() => setSelectedLeadIds(suggestedLeads.slice(0, batchSize).map((l) => l.id))}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            Selecionar os primeiros {batchSize}
          </button>
        </div>
      </div>

      {/* Lista de Sugestões */}
      <div className="space-y-2.5">
        {suggestedLeads.length > 0 ? (
          suggestedLeads.map((lead: any, idx: number) => {
            const comp = lead.companies;
            const isSelected = selectedLeadIds.includes(lead.id);
            const isCycle2 = lead.cycle >= 2;

            return (
              <div
                key={lead.id}
                onClick={() => toggleLead(lead.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? "bg-white border-blue-500 ring-1 ring-blue-500 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300 opacity-70"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 pointer-events-none"
                  />
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {comp?.name}
                      </span>
                      {isCycle2 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                          Reentrada (Ciclo 2)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {comp?.city} • {comp?.niche}
                    </p>
                  </div>
                </div>

                <span className="text-[11px] text-slate-400 font-medium shrink-0">
                  #{idx + 1}
                </span>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-700">Sem leads novos disponíveis</h3>
            <p className="text-xs text-slate-400">
              Cadastre novos leads ou busque empresas no Google Maps para montar o lote.
            </p>
            <Link
              href="/leads/novo"
              className="inline-block mt-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
            >
              + Cadastrar Lead
            </Link>
          </div>
        )}
      </div>

      {suggestedLeads.length > 0 && (
        <div className="sticky bottom-20 md:bottom-6 z-30 pt-2">
          <button
            type="button"
            disabled={selectedLeadIds.length === 0 || loading}
            onClick={handleConfirmBatch}
            className="w-full py-3.5 px-4 text-sm font-bold text-white bg-blue-600 rounded-2xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {loading ? "Confirmando Lote..." : `Confirmar Lote com ${selectedLeadIds.length} Leads`}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
