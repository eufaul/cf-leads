"use client";

import { useState } from "react";
import { recordAttemptAction } from "@/server/actions/leads";
import { Phone, MessageSquare, Mail, Calendar, CheckCircle2, XCircle, AlertCircle, Sparkles } from "lucide-react";
import { calculateNextAction, Channel, Outcome, NextAction } from "@/lib/rules-engine";

interface AttemptModalProps {
  leadId: string;
  companyName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AttemptModal({ leadId, companyName, isOpen, onClose, onSuccess }: AttemptModalProps) {
  const [channel, setChannel] = useState<Channel>("ligacao");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [reachedDecisionMaker, setReachedDecisionMaker] = useState(false);
  const [notes, setNotes] = useState("");
  const [discardReason, setDiscardReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Canais
  const channels: { id: Channel; label: string; icon: any }[] = [
    { id: "ligacao", label: "Ligação", icon: Phone },
    { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
    { id: "email", label: "E-mail", icon: Mail },
    { id: "reuniao", label: "Reunião", icon: Calendar },
  ];

  // Resultados comuns por canal
  const outcomesByChannel: Record<Channel, { id: Outcome; label: string; isSuccess?: boolean; isDecision?: boolean }[]> = {
    ligacao: [
      { id: "nao_atendeu", label: "Não atendeu" },
      { id: "caixa_postal", label: "Caixa postal" },
      { id: "secretaria_barrou", label: "Secretária barrou" },
      { id: "numero_invalido", label: "Número inválido" },
      { id: "decisor_interesse", label: "Decisor com interesse!", isSuccess: true, isDecision: true },
      { id: "decisor_sem_decisao", label: "Decisor sem decisão (agendar retorno)", isDecision: true },
      { id: "pediu_material", label: "Decisor pediu material por e-mail", isDecision: true },
      { id: "autorizou_whatsapp", label: "Decisor autorizou WhatsApp", isDecision: true },
      { id: "decisor_sem_interesse", label: "Decisor sem interesse (descartar)", isDecision: true },
      { id: "opt_out", label: "Pediu para não ligar mais (bloquear)" },
    ],
    whatsapp: [
      { id: "enviado", label: "Mensagem enviada" },
      { id: "respondeu", label: "Respondeu com interesse", isSuccess: true, isDecision: true },
      { id: "decisor_sem_interesse", label: "Respondeu sem interesse", isDecision: true },
      { id: "opt_out", label: "Pediu para não contatar" },
    ],
    email: [
      { id: "enviado", label: "E-mail enviado" },
      { id: "respondeu", label: "Respondeu com interesse", isSuccess: true, isDecision: true },
      { id: "decisor_sem_interesse", label: "Respondeu sem interesse", isDecision: true },
    ],
    reuniao: [
      { id: "decisor_interesse", label: "Reunião realizada com interesse", isSuccess: true, isDecision: true },
      { id: "decisor_sem_decisao", label: "Reunião realizada - avaliar proposta", isDecision: true },
      { id: "decisor_sem_interesse", label: "Reunião realizada - sem interesse", isDecision: true },
    ],
    sms: [
      { id: "enviado", label: "SMS enviado" },
      { id: "respondeu", label: "SMS respondido", isSuccess: true, isDecision: true },
      { id: "opt_out", label: "Pediu para não enviar SMS" },
    ],
  };

  const calculatedRule = outcome
    ? calculateNextAction({
        channel,
        outcome,
        occurredAt: new Date(),
      })
    : null;

  async function handleConfirm() {
    if (!outcome) return;
    setLoading(true);
    setError(null);

    const result = await recordAttemptAction({
      leadId,
      channel,
      outcome,
      reachedDecisionMaker,
      notes: notes.trim() || undefined,
      discardReason: discardReason.trim() || undefined,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setLoading(false);
      onClose();
      if (onSuccess) onSuccess();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Topo */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Registrar Contato</h3>
            <p className="text-xs text-slate-500 truncate max-w-[280px]">{companyName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-start gap-2 p-3 text-xs rounded-xl bg-red-50 text-red-700 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Toque 1: Canal */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              1. Por onde você contatou?
            </span>
            <div className="grid grid-cols-4 gap-2">
              {channels.map((c) => {
                const Icon = c.icon;
                const isSel = channel === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setChannel(c.id);
                      setOutcome(null);
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      isSel
                        ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-xs ring-1 ring-blue-600"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toque 2: Resultado */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              2. O que aconteceu?
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {outcomesByChannel[channel].map((o) => {
                const isSel = outcome === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setOutcome(o.id);
                      if (o.isDecision) {
                        setReachedDecisionMaker(true);
                      }
                    }}
                    className={`text-left p-2.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-between ${
                      isSel
                        ? "border-blue-600 bg-blue-50 text-blue-800 font-semibold shadow-xs ring-1 ring-blue-600"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{o.label}</span>
                    {o.isSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toque 3: Sugestão Automática das Regras */}
          {calculatedRule && (
            <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Próxima Ação Sugerida pelo Sistema:</span>
              </div>
              <p className="text-xs text-blue-800 font-medium">
                {calculatedRule.suggestedActionLabel}
              </p>
              <div className="text-[11px] text-blue-600">
                Data sugerida:{" "}
                <span className="font-semibold">
                  {calculatedRule.suggestedDate.toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Campos Opcionais / Condicionais */}
          {outcome === "decisor_sem_interesse" && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Motivo do Descarte (Obrigatório) *
              </label>
              <input
                value={discardReason}
                onChange={(e) => setDiscardReason(e.target.value)}
                placeholder="Ex: Já contratou agência / Sem orçamento este semestre"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Observação / Informações da Secretária (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Falar com Dr. Marcelo após as 14h / Secretária Cláudia foi muito prestativa"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Rodapé com botão de confirmação */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!outcome || loading || (outcome === "decisor_sem_interesse" && !discardReason.trim())}
            onClick={handleConfirm}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? "Gravando..." : "Confirmar e Agendar"}
          </button>
        </div>
      </div>
    </div>
  );
}
