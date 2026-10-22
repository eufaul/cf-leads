"use client";

import { useState } from "react";
import { loginAction } from "@/server/actions/auth";
import { PhoneCall, Lock, Mail, AlertCircle, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-sm space-y-6">
        {/* Cabeçalho do App */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
            <PhoneCall className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            CF Leads
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Agência C&F — Prospecção Ativa
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-800">Acesso Restrito</h2>
            <p className="text-xs text-slate-500">
              Digite seu e-mail e senha de administrador para acessar a operação.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="email">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="seu-email@agenciacf.com.br"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-slate-50/50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="password">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-slate-50/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? "Entrando..." : "Entrar no Sistema"}
            </button>
          </form>

          <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Autenticação protegida por RLS & MFA</span>
          </div>
        </div>
      </div>
    </main>
  );
}
