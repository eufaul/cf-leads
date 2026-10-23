"use client";

import { useState } from "react";
import { updateSystemSettingsAction } from "@/server/actions/management";
import { Sliders, CheckCircle2, AlertCircle } from "lucide-react";

export function SettingsEditor({ settings }: { settings: any }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const res = await updateSystemSettingsAction(formData);

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Parâmetros Operacionais da Agência</h2>
            <p className="text-xs text-slate-500">
              Ajuste as metas de lote, limites semanais e tempos de quarentena.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 text-xs rounded-xl bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Configurações atualizadas com sucesso!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Tamanho do Lote Semanal</label>
            <input
              type="number"
              name="batchSize"
              defaultValue={settings?.batch_size || 30}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <span className="text-[10px] text-slate-400">Sugestão de segunda-feira</span>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Teto Tentativas/Semana</label>
            <input
              type="number"
              name="maxAttemptsWeek"
              defaultValue={settings?.max_attempts_week || 5}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <span className="text-[10px] text-slate-400">Por lead antes de sugerir encerramento</span>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Quarentena de Reentrada (dias)</label>
            <input
              type="number"
              name="reentryDays"
              defaultValue={settings?.reentry_days || 60}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <span className="text-[10px] text-slate-400">Repouso para Ciclo 2</span>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Retorno Padrão (dias)</label>
            <input
              type="number"
              name="defaultReturnDays"
              defaultValue={settings?.default_return_days || 7}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <span className="text-[10px] text-slate-400">Quando decisor não sugerir data</span>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Máximo de Remarcações</label>
            <input
              type="number"
              name="maxReschedules"
              defaultValue={settings?.max_reschedules || 3}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <span className="text-[10px] text-slate-400">Sugere descarte ao atingir</span>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Fuso Horário Operacional</label>
            <input
              type="text"
              name="timezone"
              defaultValue={settings?.timezone || "America/Sao_Paulo"}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <span className="text-[10px] text-slate-400">Horário padrão do sistema</span>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-2xs disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar Parâmetros"}
          </button>
        </div>
      </form>
    </div>
  );
}
