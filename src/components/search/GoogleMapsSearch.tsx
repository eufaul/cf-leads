"use client";

import { useState } from "react";
import { searchGooglePlacesAction, importGooglePlacesLeadsAction, ProcessedSearchResult } from "@/server/actions/search";
import { Search, Compass, CheckCircle2, AlertCircle, Building2, Phone, Globe, Star, ShieldCheck, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatPhoneDisplay } from "@/lib/phone";
import Link from "next/link";

export function GoogleMapsSearch({ recentJobs }: { recentJobs: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ProcessedSearchResult[] | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importedSuccess, setImportedSuccess] = useState<number | null>(null);

  async function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);
    setImportedSuccess(null);

    const formData = new FormData(e.currentTarget);
    const res = await searchGooglePlacesAction(formData);

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else if (res.results) {
      setResults(res.results);
      setCurrentJobId(res.jobId || null);
      // Auto selecionar apenas os que NÃO são duplicatas
      const validIds = res.results.filter((r) => !r.isDuplicate).map((r) => r.placeId);
      setSelectedPlaceIds(validIds);
      setLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedPlaceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function selectAllValid() {
    if (!results) return;
    const validIds = results.filter((r) => !r.isDuplicate).map((r) => r.placeId);
    setSelectedPlaceIds(validIds);
  }

  async function handleImport() {
    if (!results || !currentJobId || selectedPlaceIds.length === 0) return;
    setImporting(true);
    setError(null);

    const placesToImport = results
      .filter((r) => selectedPlaceIds.includes(r.placeId) && !r.isDuplicate)
      .map((r) => ({
        placeId: r.placeId,
        title: r.title,
        phoneE164: r.phoneE164,
        website: r.website,
        city: r.city,
        categoryName: r.categoryName,
        address: r.address,
        totalScore: r.totalScore,
        reviewsCount: r.reviewsCount,
      }));

    const res = await importGooglePlacesLeadsAction({
      jobId: currentJobId,
      places: placesToImport,
    });

    if (res.error) {
      setError(res.error);
      setImporting(false);
    } else {
      setImporting(false);
      setImportedSuccess(res.importedCount || 0);
      setResults(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-5">
      {/* Formulário de Busca */}
      <form onSubmit={handleSearch} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
          <Compass className="w-4 h-4" />
          <span>Nova Varredura Google Places</span>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 text-xs rounded-xl bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1 sm:col-span-1">
            <label className="text-xs font-semibold text-slate-700">Nicho / Palavra-Chave *</label>
            <input
              name="niche"
              required
              placeholder="Ex: Clínicas, Marmorarias"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <label className="text-xs font-semibold text-slate-700">Cidade e Estado *</label>
            <input
              name="city"
              required
              placeholder="Ex: Indaiatuba, SP"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <label className="text-xs font-semibold text-slate-700">Qtd. de Empresas</label>
            <select
              name="maxResults"
              defaultValue="20"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
            >
              <option value="10">10 empresas</option>
              <option value="20">20 empresas</option>
              <option value="30">30 empresas</option>
              <option value="50">50 empresas</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-0.5 text-xs text-slate-600">
          <input
            type="checkbox"
            name="onlyWithoutWebsite"
            id="onlyWithoutWebsite"
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="onlyWithoutWebsite" className="cursor-pointer font-medium">
            Priorizar somente empresas <strong>sem site oficial</strong>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Search className="w-4 h-4" />
          <span>{loading ? "Varrendo Google Maps e Checando Duplicatas..." : "Buscar Empresas"}</span>
        </button>
      </form>

      {/* Sucesso após importação */}
      {importedSuccess !== null && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-emerald-900">Importação Concluída com Sucesso!</h4>
              <p className="text-xs text-emerald-700">
                <strong>{importedSuccess}</strong> novas empresas foram importadas e cadastradas no sistema. Escolha como deseja usá-las agora:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs font-bold">
            <Link
              href="/hoje"
              className="py-2.5 px-3 rounded-xl bg-emerald-600 text-white text-center hover:bg-emerald-700 transition-colors shadow-2xs flex items-center justify-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Ligar Agora (Hoje)</span>
            </Link>

            <Link
              href="/lote"
              className="py-2.5 px-3 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-center hover:bg-emerald-100/70 transition-colors shadow-2xs flex items-center justify-center gap-1.5"
            >
              <span>Montar Lote Semanal</span>
            </Link>

            <Link
              href="/leads"
              className="py-2.5 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-center hover:bg-slate-100 transition-colors shadow-2xs flex items-center justify-center gap-1.5"
            >
              <span>Ver Base de Leads</span>
            </Link>
          </div>
        </div>
      )}

      {/* Prévia dos Resultados */}
      {results && results.length > 0 && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Passo 1 de 2: Prévia encontrada no Maps</p>
              <p className="text-blue-700">
                Marque abaixo as empresas que deseja trabalhar e clique no botão azul <strong>"Importar Empresas Selecionadas"</strong> para adicioná-las à sua lista de prospecção.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Empresas Encontradas ({results.length})</h3>
              <p className="text-xs text-slate-500">
                {results.filter((r) => !r.isDuplicate).length} empresas inéditas aptas para importação
              </p>
            </div>
            <button
              type="button"
              onClick={selectAllValid}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Selecionar Todas Inéditas
            </button>
          </div>

          <div className="space-y-2">
            {results.map((item) => {
              const isSelected = selectedPlaceIds.includes(item.placeId);
              return (
                <div
                  key={item.placeId}
                  onClick={() => !item.isDuplicate && toggleSelect(item.placeId)}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    item.isDuplicate
                      ? "bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed"
                      : isSelected
                      ? "bg-white border-blue-500 ring-1 ring-blue-500 shadow-xs cursor-pointer"
                      : "bg-white border-slate-200 hover:border-slate-300 cursor-pointer"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected && !item.isDuplicate}
                        disabled={item.isDuplicate}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 mt-0.5 pointer-events-none"
                      />

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
                          {item.totalScore && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              {item.totalScore.toFixed(1)} ({item.reviewsCount})
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                          {item.phone && (
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {formatPhoneDisplay(item.phoneE164 || item.phone)}
                            </span>
                          )}
                          {item.website ? (
                            <span className="flex items-center gap-1 text-blue-600">
                              <Globe className="w-3 h-3" />
                              {item.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1 rounded">
                              Sem site oficial
                            </span>
                          )}
                        </div>

                        {item.address && (
                          <p className="text-[10px] text-slate-400 truncate">{item.address}</p>
                        )}
                      </div>
                    </div>

                    {item.isDuplicate && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 shrink-0">
                        Já existe / Bloqueado
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botão de Importação Flutuante */}
          <div className="sticky bottom-20 md:bottom-6 z-30 pt-2">
            <button
              type="button"
              disabled={selectedPlaceIds.length === 0 || importing}
              onClick={handleImport}
              className="w-full py-3.5 px-4 text-xs font-bold text-white bg-blue-600 rounded-2xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {importing
                  ? "Importando Empresas para a Base..."
                  : `Importar ${selectedPlaceIds.length} Empresas Selecionadas`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Histórico de Varreduras Recentes */}
      {recentJobs && recentJobs.length > 0 && !results && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Varreduras Recentes
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {recentJobs.slice(0, 5).map((job) => (
              <div key={job.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">{job.niche}</span>
                  <p className="text-[11px] text-slate-500">{job.city}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-blue-600">
                    +{job.results_count || 0} importados
                  </span>
                  <p className="text-[10px] text-slate-400">
                    {new Date(job.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
