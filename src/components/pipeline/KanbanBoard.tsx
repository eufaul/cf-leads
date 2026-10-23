"use client";

import { useState } from "react";
import { updateLeadStatusAction } from "@/server/actions/management";
import { Phone, MapPin, Building2, User, Star, ArrowRight, Search, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getTelLink } from "@/lib/phone";
import { useRouter } from "next/navigation";

interface KanbanLead {
  id: string;
  status: string;
  cycle: number;
  next_action: string;
  next_action_at: string | null;
  companies: {
    id: string;
    name: string;
    phone_e164: string | null;
    city: string | null;
    niche: string | null;
    google_rating?: number | null;
    contacts?: Array<{
      name: string;
      is_decision_maker: boolean;
    }>;
  } | null;
}

export function KanbanBoard({ initialLeads }: { initialLeads: KanbanLead[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState<KanbanLead[]>(initialLeads);
  const [searchTerm, setSearchTerm] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);

  const columns = [
    { id: "novo", label: "Novos", color: "bg-slate-50 border-slate-200", badge: "bg-slate-200 text-slate-800" },
    { id: "no_lote", label: "No Lote", color: "bg-blue-50/50 border-blue-200", badge: "bg-blue-200 text-blue-900" },
    { id: "retorno_agendado", label: "Retorno Agendado", color: "bg-amber-50/50 border-amber-200", badge: "bg-amber-200 text-amber-900" },
    { id: "oportunidade", label: "Oportunidades", color: "bg-emerald-50/50 border-emerald-200", badge: "bg-emerald-200 text-emerald-900" },
    { id: "descartado", label: "Descartados", color: "bg-rose-50/50 border-rose-200", badge: "bg-rose-200 text-rose-900" },
  ];

  async function handleMoveStatus(leadId: string, newStatus: string) {
    setMovingId(leadId);
    // Otimista
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );

    const res = await updateLeadStatusAction(leadId, newStatus);
    setMovingId(null);
    if (res.error) {
      router.refresh();
    }
  }

  const filteredLeads = leads.filter((l) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const comp = l.companies;
    return (
      comp?.name.toLowerCase().includes(term) ||
      comp?.niche?.toLowerCase().includes(term) ||
      comp?.city?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      {/* Barra de Filtro do Pipeline */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por empresa, nicho ou cidade..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Total: <strong className="text-slate-900">{filteredLeads.length}</strong> leads no fluxo
        </div>
      </div>

      {/* Colunas do Kanban com Flex e largura fixa */}
      <div className="flex gap-4 overflow-x-auto pb-4 items-start w-full">
        {columns.map((col) => {
          const colLeads = filteredLeads.filter((l) => l.status === col.id);

          return (
            <div
              key={col.id}
              className={`rounded-2xl border p-3.5 flex flex-col w-[280px] shrink-0 ${col.color}`}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80">
                <span className="text-xs font-bold text-slate-800">{col.label}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                  {colLeads.length}
                </span>
              </div>

              <div className="space-y-2.5 overflow-y-auto max-h-[70vh]">
                {colLeads.length > 0 ? (
                  colLeads.map((lead) => {
                    const comp = lead.companies;
                    const telLink = getTelLink(comp?.phone_e164);
                    const dm = comp?.contacts?.find((c) => c.is_decision_maker);

                    return (
                      <div
                        key={lead.id}
                        className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all space-y-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-1">
                            <Link
                              href={`/leads/${lead.id}`}
                              className="text-xs font-bold text-slate-900 hover:text-blue-600 truncate block flex-1"
                            >
                              {comp?.name}
                            </Link>
                            {comp?.google_rating && (
                              <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 shrink-0">
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                {comp.google_rating}
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 truncate">
                            {comp?.city} • {comp?.niche}
                          </p>

                          {dm && (
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                              <User className="w-3 h-3 text-blue-500" />
                              <span className="truncate">{dm.name}</span>
                            </div>
                          )}
                        </div>

                        {/* Ações e Mover de Coluna */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px]">
                          <div className="flex items-center gap-1">
                            {telLink && (
                              <a
                                href={telLink}
                                title="Ligar"
                                className="w-6 h-6 flex items-center justify-center rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                            )}
                            <Link
                              href={`/leads/${lead.id}`}
                              className="text-slate-500 hover:text-blue-600 font-medium px-1.5 py-0.5 rounded hover:bg-slate-100"
                            >
                              Ficha
                            </Link>
                          </div>

                          {/* Dropdown Mover */}
                          <select
                            value={lead.status}
                            disabled={movingId === lead.id}
                            onChange={(e) => handleMoveStatus(lead.id, e.target.value)}
                            className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                          >
                            <option value="novo">Mover: Novo</option>
                            <option value="no_lote">Mover: No Lote</option>
                            <option value="retorno_agendado">Mover: Retorno</option>
                            <option value="oportunidade">Mover: Oportunidade</option>
                            <option value="descartado">Mover: Descartado</option>
                          </select>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs bg-white/40 rounded-xl border border-dashed border-slate-200">
                    Nenhum lead nesta etapa
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
