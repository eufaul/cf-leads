"use client";

import { useState } from "react";
import { AttemptModal } from "@/components/leads/AttemptModal";
import { Phone, MessageSquare, Mail, CheckCircle, Clock, MapPin, Building2, User, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatPhoneDisplay, getTelLink, getWhatsAppLink } from "@/lib/phone";
import { useRouter } from "next/navigation";

interface TodayItem {
  id: string;
  leadId: string;
  companyName: string;
  phoneE164: string | null;
  email: string | null;
  city: string | null;
  niche: string | null;
  decisionMakerName: string | null;
  nextAction: string;
  nextActionAt: string | null;
  attemptsCount: number;
  status: string;
  priorityLabel: string;
}

export function TodayQueue({ items }: { items: TodayItem[] }) {
  const [selectedLead, setSelectedLead] = useState<{ id: string; name: string } | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        items.map((item, index) => {
          const telLink = getTelLink(item.phoneE164);
          const waLink = getWhatsAppLink(item.phoneE164);
          const emailLink = item.email ? `mailto:${item.email}` : null;

          return (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all space-y-3"
            >
              {/* Topo do Card */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                      #{index + 1}
                    </span>
                    <Link
                      href={`/leads/${item.leadId}`}
                      className="text-base font-bold text-slate-900 truncate hover:text-blue-600 transition-colors"
                    >
                      {item.companyName}
                    </Link>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    {item.city && <span>{item.city}</span>}
                    {item.niche && <span>• {item.niche}</span>}
                    {item.decisionMakerName && (
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        • <User className="w-3 h-3 text-blue-500" /> {item.decisionMakerName}
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                  {item.priorityLabel}
                </span>
              </div>

              {/* Informação da Ação Sugerida */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    Ação: <strong className="capitalize">{item.nextAction}</strong>
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {item.attemptsCount} {item.attemptsCount === 1 ? "tentativa" : "tentativas"}
                </span>
              </div>

              {/* Botões Rápidos */}
              <div className="flex items-center gap-2 pt-0.5">
                {telLink && (
                  <a
                    href={telLink}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-xs hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Ligar</span>
                  </a>
                )}

                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    title="WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                  </a>
                )}

                {emailLink && (
                  <a
                    href={emailLink}
                    className="p-2.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors"
                    title="E-mail"
                  >
                    <Mail className="w-4 h-4 text-blue-600" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedLead({ id: item.leadId, name: item.companyName })}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 text-white font-semibold text-xs shadow-xs hover:bg-slate-800 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Registrar</span>
                </button>
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Fila do Dia Limpa!</h3>
            <p className="text-xs text-slate-500">
              Nenhuma ação pendente para hoje. Você pode abrir o lote da semana ou cadastrar novos leads.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Link
              href="/leads/novo"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
            >
              + Novo Lead
            </Link>
            <Link
              href="/leads"
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Ver Todos os Leads
            </Link>
          </div>
        </div>
      )}

      {selectedLead && (
        <AttemptModal
          leadId={selectedLead.id}
          companyName={selectedLead.name}
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
