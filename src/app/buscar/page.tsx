import { createClient } from "@/lib/supabase/server";
import { TopHeader } from "@/components/layout/TopHeader";
import { MapPin, Search, Compass, ShieldCheck } from "lucide-react";

export default async function BuscarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <TopHeader userEmail={user?.email} />

      <main className="max-w-xl mx-auto p-4 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider">
            <Compass className="w-4 h-4" />
            <span>Captação Ativa</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Buscar Empresas no Google Maps</h1>
          <p className="text-xs text-slate-500">
            Varredura automatizada com remoção prévia de duplicatas e empresas bloqueadas.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Nicho / Palavra-chave *</label>
              <input
                placeholder="Ex: Clínicas Odontológicas, Marmorarias, Energia Solar"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Cidade / Região *</label>
              <input
                placeholder="Ex: Indaiatuba, SP"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
              <input type="checkbox" id="noWebsite" className="rounded text-blue-600" />
              <label htmlFor="noWebsite">Priorizar empresas sem site oficial</label>
            </div>
          </div>

          <button
            type="button"
            className="w-full py-3 px-4 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>Buscar Empresas no Google Maps</span>
          </button>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Proteção Automática Anti-Duplicação</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Toda busca no Google Maps compara os resultados com a sua base atual e com os registros bloqueados por encerramento definitivo (LGPD), descartando automaticamente antes de você selecionar quais importar.
          </p>
        </div>
      </main>
    </div>
  );
}
