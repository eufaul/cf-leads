"use client";

import { useState } from "react";
import { exportLeadsCsvAction } from "@/server/actions/management";
import { Download, CheckCircle, AlertCircle } from "lucide-react";

export function ExportCsvButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);

    const res = await exportLeadsCsvAction();
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else if (res.csvContent && res.filename) {
      // Disparar download direto no navegador
      const blob = new Blob([res.csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", res.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-rose-600">{error}</span>}
      <button
        type="button"
        disabled={loading}
        onClick={handleExport}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
      >
        <Download className="w-3.5 h-3.5 text-slate-500" />
        <span>{loading ? "Exportando..." : "Exportar Base (CSV)"}</span>
      </button>
    </div>
  );
}
