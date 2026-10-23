"use client";

import { useState } from "react";
import { addApifyTokenAction, removeApifyTokenAction } from "@/server/actions/settings";
import { Key, Plus, Trash2, ShieldCheck, AlertCircle } from "lucide-react";

interface ApifyTokensManagerProps {
  tokens: Array<{ id: string; label: string; token: string; created_at?: string }>;
  envTokenExists: boolean;
}

export function ApifyTokensManager({ tokens, envTokenExists }: ApifyTokensManagerProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await addApifyTokenAction(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setLoading(false);
      setShowAddForm(false);
      (e.target as HTMLFormElement).reset();
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Deseja remover esta chave de busca?")) return;
    await removeApifyTokenAction(id);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Pool de Chaves Apify (Google Maps)</h2>
            <p className="text-xs text-slate-500">
              Cadastre múltiplas contas gratuitas para rotação e limite estendido de buscas.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddForm ? "Fechar" : "Nova Chave"}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 text-xs rounded-xl bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Formulário de Nova Chave */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Nome / Identificação da Conta *</label>
            <input
              name="label"
              required
              placeholder="Ex: Conta 2 - E-mail Alternativo"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Token da Apify (apify_api_...) *</label>
            <input
              name="token"
              required
              placeholder="apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Salvando..." : "Salvar Chave no Pool"}
            </button>
          </div>
        </form>
      )}

      {/* Lista de Chaves Ativas */}
      <div className="space-y-2">
        {tokens.length > 0 ? (
          tokens.map((item, idx) => (
            <div
              key={item.id}
              className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{item.label}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-100 text-emerald-800">
                    Ativa
                  </span>
                </div>
                <p className="font-mono text-[11px] text-slate-400">
                  {item.token ? `${item.token.substring(0, 14)}••••••••${item.token.substring(item.token.length - 4)}` : "Chave mascarada"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                title="Remover Chave"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        ) : envTokenExists ? (
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">Chave Principal (Servidor)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-blue-100 text-blue-800">
                  Padrão .env
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-400">apify_api_••••••••••</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Nenhuma chave cadastrada ainda.</p>
        )}
      </div>

      <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-2 text-[11px] text-blue-800">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span>
          <strong>Failover Automático:</strong> Se uma das contas da Apify esgotar o limite gratuito de créditos, o sistema passa automaticamente para a próxima chave ativa da lista sem interromper a sua busca.
        </span>
      </div>
    </div>
  );
}
