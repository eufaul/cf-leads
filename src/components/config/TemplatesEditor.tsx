"use client";

import { useState } from "react";
import { saveMessageTemplateAction, deleteMessageTemplateAction } from "@/server/actions/management";
import { MessageSquare, Plus, Trash2, Edit2, CheckCircle2, AlertCircle } from "lucide-react";

interface TemplateItem {
  id: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
}

export function TemplatesEditor({ initialTemplates }: { initialTemplates: TemplateItem[] }) {
  const [templates, setTemplates] = useState<TemplateItem[]>(initialTemplates);
  const [editingTemplate, setEditingTemplate] = useState<TemplateItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bodyText, setBodyText] = useState("");

  function openCreate() {
    setEditingTemplate(null);
    setBodyText("");
    setIsCreating(true);
    setError(null);
  }

  function openEdit(tpl: TemplateItem) {
    setEditingTemplate(tpl);
    setBodyText(tpl.body);
    setIsCreating(false);
    setError(null);
  }

  function insertVariable(variable: string) {
    setBodyText((prev) => prev + ` ${variable} `);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("body", bodyText);
    if (editingTemplate) {
      formData.set("id", editingTemplate.id);
    }

    const res = await saveMessageTemplateAction(formData);
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setLoading(false);
      setIsCreating(false);
      setEditingTemplate(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este modelo?")) return;
    await deleteMessageTemplateAction(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Modelos de Mensagem (Templates)</h2>
            <p className="text-xs text-slate-500">
              Personalize os scripts de E-mail e WhatsApp com variáveis inteligentes.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Modelo</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 text-xs rounded-xl bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Formulário de Criação/Edição */}
      {(isCreating || editingTemplate) && (
        <form onSubmit={handleSave} className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3 text-xs">
          <h3 className="font-bold text-slate-900">
            {editingTemplate ? `Editar: ${editingTemplate.name}` : "Novo Modelo de Mensagem"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Nome do Modelo *</label>
              <input
                name="name"
                defaultValue={editingTemplate?.name || ""}
                required
                placeholder="Ex: Apresentação para Marmorarias"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Canal *</label>
              <select
                name="channel"
                defaultValue={editingTemplate?.channel || "whatsapp"}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-mail</option>
                <option value="sms">SMS</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Assunto (obrigatório se for e-mail)</label>
            <input
              name="subject"
              defaultValue={editingTemplate?.subject || ""}
              placeholder="Ex: Parceria de prospecção para {{empresa}}"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700">Conteúdo da Mensagem *</label>
              {/* Botões de variáveis dinâmicas */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 mr-1">Inserir:</span>
                {["{{empresa}}", "{{decisor}}", "{{cidade}}", "{{nicho}}"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-blue-600 hover:bg-blue-50"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={4}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              required
              placeholder="Digite o texto da mensagem..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-sans"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingTemplate(null);
              }}
              className="px-3 py-1.5 font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Salvando..." : "Salvar Modelo"}
            </button>
          </div>
        </form>
      )}

      {/* Lista de Modelos */}
      <div className="space-y-3">
        {templates.map((tpl) => (
          <div key={tpl.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{tpl.name}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.2 rounded bg-blue-100 text-blue-800">
                  {tpl.channel}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(tpl)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                  title="Editar"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(tpl.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {tpl.subject && (
              <p className="text-xs font-semibold text-slate-700">Assunto: {tpl.subject}</p>
            )}

            <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap font-sans">
              {tpl.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
