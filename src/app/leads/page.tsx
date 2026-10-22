import { createClient } from "@/lib/supabase/server";
import { TopHeader } from "@/components/layout/TopHeader";
import Link from "next/link";
import { PlusCircle, Search, Phone, MapPin, Building2, ChevronRight, User } from "lucide-react";
import { formatPhoneDisplay, getTelLink } from "@/lib/phone";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
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
      ),
      contacts (
        name,
        is_decision_maker
      )
    `)
    .order("created_at", { ascending: false });

  if (status && status !== "todos") {
    query = query.eq("status", status);
  }

  const { data: leads } = await query;

  // Filtragem simples por busca de texto (nome, nicho ou cidade)
  const filteredLeads = leads?.filter((l: any) => {
    if (!q) return true;
    const term = q.toLowerCase();
    const comp = l.companies;
    return (
      comp?.name?.toLowerCase().includes(term) ||
      comp?.niche?.toLowerCase().includes(term) ||
      comp?.city?.toLowerCase().includes(term)
    );
  });

  const statusBadges: Record<string, { label: string; bg: string; text: string }> = {
    novo: { label: "Novo", bg: "bg-slate-100", text: "text-slate-700" },
    no_lote: { label: "No Lote", bg: "bg-blue-100", text: "text-blue-800" },
    retorno_agendado: { label: "Retorno Agendado", bg: "bg-amber-100", text: "text-amber-800" },
    oportunidade: { label: "Oportunidade", bg: "bg-emerald-100", text: "text-emerald-800" },
    descartado: { label: "Descartado", bg: "bg-rose-100", text: "text-rose-800" },
    encerrado_temporario: { label: "Encerrado Temp.", bg: "bg-purple-100", text: "text-purple-800" },
    encerrado_definitivo: { label: "Encerrado Def.", bg: "bg-zinc-200", text: "text-zinc-800" },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TopHeader />

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Topo com título e ação de novo lead */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Base de Leads</h1>
            <p className="text-xs text-slate-500">
              {filteredLeads?.length || 0} empresas cadastradas
            </p>
          </div>
          <Link
            href="/leads/novo"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Novo Lead</span>
          </Link>
        </div>

        {/* Barra de Pesquisa e Filtros */}
        <div className="space-y-2">
          <form method="GET" className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              name="q"
              defaultValue={q || ""}
              placeholder="Buscar por empresa, cidade ou nicho..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </form>

          {/* Filtros de Status rápidos */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {["todos", "novo", "no_lote", "retorno_agendado", "oportunidade", "descartado"].map((st) => {
              const isSelected = (!status && st === "todos") || status === st;
              return (
                <Link
                  key={st}
                  href={`/leads?${new URLSearchParams({ ...(q ? { q } : {}), ...(st !== "todos" ? { status: st } : {}) })}`}
                  className={`px-3 py-1 rounded-full whitespace-nowrap capitalize transition-colors ${
                    isSelected
                      ? "bg-blue-600 text-white font-semibold shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {st.replace("_", " ")}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Lista de Leads */}
        <div className="space-y-2.5">
          {filteredLeads && filteredLeads.length > 0 ? (
            filteredLeads.map((lead: any) => {
              const comp = lead.companies;
              const decisionMaker = lead.contacts?.find((c: any) => c.is_decision_maker);
              const badge = statusBadges[lead.status] || { label: lead.status, bg: "bg-slate-100", text: "text-slate-700" };
              const telLink = getTelLink(comp?.phone_e164);

              return (
                <div
                  key={lead.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all flex items-center justify-between gap-3"
                >
                  <Link href={`/leads/${lead.id}`} className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 truncate">
                        {comp?.name}
                      </h2>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
                      {comp?.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {comp.city}
                        </span>
                      )}
                      {comp?.niche && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {comp.niche}
                        </span>
                      )}
                      {decisionMaker && (
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <User className="w-3 h-3 text-blue-500" />
                          {decisionMaker.name}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Ação rápida de ligar pelo celular */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {telLink && (
                      <a
                        href={telLink}
                        title="Ligar Agora"
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    <Link
                      href={`/leads/${lead.id}`}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-700">Nenhum lead encontrado</h3>
                <p className="text-xs text-slate-400">
                  Cadastre seu primeiro lead ou ajuste os filtros acima.
                </p>
              </div>
              <Link
                href="/leads/novo"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Adicionar Primeiro Lead</span>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
