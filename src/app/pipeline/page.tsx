import { createClient } from "@/lib/supabase/server";
import { TopHeader } from "@/components/layout/TopHeader";
import Link from "next/link";
import { MapPin, Building2, Phone } from "lucide-react";
import { getTelLink } from "@/lib/phone";

export default async function PipelinePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: leads } = await supabase
    .from("leads")
    .select(`
      id,
      status,
      cycle,
      next_action,
      next_action_at,
      companies (
        id,
        name,
        phone_e164,
        city,
        niche
      )
    `)
    .order("created_at", { ascending: false });

  const columns = [
    { id: "novo", label: "Novos", color: "border-slate-300 bg-slate-100/60" },
    { id: "no_lote", label: "No Lote", color: "border-blue-300 bg-blue-50/60" },
    { id: "retorno_agendado", label: "Retorno Agendado", color: "border-amber-300 bg-amber-50/60" },
    { id: "oportunidade", label: "Oportunidades", color: "border-emerald-300 bg-emerald-50/60" },
    { id: "descartado", label: "Descartados", color: "border-rose-300 bg-rose-50/60" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <TopHeader userEmail={user?.email} />

      <main className="max-w-7xl mx-auto p-4 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pipeline de Prospecção</h1>
          <p className="text-xs text-slate-500">Fluxo visual de estados dos leads da agência</p>
        </div>

        {/* Kanban Board Responsivo */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {columns.map((col) => {
            const columnLeads = (leads || []).filter((l: any) => l.status === col.id);

            return (
              <div
                key={col.id}
                className={`rounded-2xl border p-3 flex flex-col min-w-[260px] ${col.color}`}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-800">{col.label}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 shadow-2xs">
                    {columnLeads.length}
                  </span>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[70vh]">
                  {columnLeads.map((lead: any) => {
                    const comp = lead.companies;
                    const telLink = getTelLink(comp?.phone_e164);

                    return (
                      <div
                        key={lead.id}
                        className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-2"
                      >
                        <div className="space-y-0.5">
                          <Link
                            href={`/leads/${lead.id}`}
                            className="text-xs font-bold text-slate-900 hover:text-blue-600 block truncate"
                          >
                            {comp?.name}
                          </Link>
                          <p className="text-[11px] text-slate-500 truncate">
                            {comp?.city} • {comp?.niche}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                          <span className="text-slate-400 capitalize">{lead.next_action || "Sem ação"}</span>
                          {telLink && (
                            <a
                              href={telLink}
                              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50"
                              title="Ligar"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
