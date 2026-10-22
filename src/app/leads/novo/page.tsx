"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopHeader } from "@/components/layout/TopHeader";
import { createQuickLeadAction } from "@/server/actions/leads";
import { Building2, Phone, MapPin, Briefcase, User, Globe, FileText, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function NovoLeadPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createQuickLeadAction(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.success && result.leadId) {
      router.push(`/leads/${result.leadId}`);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopHeader />

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {/* Topo de navegação */}
        <div className="flex items-center gap-2">
          <Link
            href="/leads"
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cadastro Rápido de Lead</h1>
            <p className="text-xs text-slate-500">Adicione uma empresa para a prospecção da agência</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3.5 text-xs rounded-xl bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold block">Não foi possível cadastrar</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
          {/* Seção 1: Dados Essenciais */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dados da Empresa</h2>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Nome da Empresa *
              </label>
              <input
                name="name"
                required
                placeholder="Ex: Marmoraria Modelo"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Telefone Principal *
                </label>
                <input
                  name="phone"
                  required
                  placeholder="Ex: 19 99999-9999"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Cidade *
                </label>
                <input
                  name="city"
                  required
                  placeholder="Ex: Indaiatuba"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                Nicho / Segmento *
              </label>
              <input
                name="nicho"
                required
                placeholder="Ex: Clínicas Odontológicas, Marmorarias, Energia Solar"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Seção 2: Decisor Conhecido (Opcional) */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Decisor (Se conhecido)</h2>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Nome do Decisor
              </label>
              <input
                name="decisionMakerName"
                placeholder="Ex: Dr. Roberto / Marcelo Silveira"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Telefone / WhatsApp Decisor</label>
                <input
                  name="decisionMakerPhone"
                  placeholder="Ex: 19 98888-7777"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">E-mail Decisor</label>
                <input
                  name="decisionMakerEmail"
                  type="email"
                  placeholder="roberto@empresa.com.br"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Seção 3: Detalhes Complementares (Opcionais) */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dados Adicionais (Opcionais)</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  CNPJ
                </label>
                <input
                  name="cnpj"
                  placeholder="00.000.000/0000-00"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  Website
                </label>
                <input
                  name="website"
                  placeholder="https://empresa.com.br"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? "Verificando e Salvando..." : "Salvar Lead"}
          </button>
        </form>
      </main>
    </div>
  );
}
