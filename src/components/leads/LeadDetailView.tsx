"use client";

import { useState } from "react";
import { AttemptModal } from "./AttemptModal";
import { Phone, MessageSquare, Mail, Globe, MapPin, Building2, User, Clock, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { formatPhoneDisplay, getTelLink, getWhatsAppLink } from "@/lib/phone";
import { useRouter } from "next/navigation";

interface LeadDetailProps {
  lead: any;
  company: any;
  contacts: any[];
  attempts: any[];
  decisionMaker: any;
}

export function LeadDetailView({ lead, company, contacts, attempts, decisionMaker }: LeadDetailProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  const telLink = getTelLink(company.phone_e164);
  const waLink = getWhatsAppLink(company.phone_e164);
  const emailLink = company.email ? `mailto:${company.email}` : null;

  return (
    <div className="space-y-4">
      {/* Barra de Retorno e Status */}
      <div className="flex items-center justify-between">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para lista</span>
        </Link>
        <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
          {lead.status.replace("_", " ")} (Ciclo {lead.cycle})
        </span>
      </div>

      {/* Card Principal da Empresa */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{company.name}</h1>
          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {company.city || "Cidade não informada"}
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {company.niche || "Nicho não informado"}
            </span>
            {company.website && (
              <a
                href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline"
              >
                <Globe className="w-3.5 h-3.5" />
                {company.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>

        {/* Botões Rápidos de Ação de 1 Toque */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {telLink ? (
            <a
              href={telLink}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-sm hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>Ligar</span>
            </a>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-slate-100 text-slate-400 font-semibold text-xs"
            >
              <Phone className="w-4 h-4" />
              <span>Sem Telefone</span>
            </button>
          )}

          {waLink ? (
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-xs hover:bg-emerald-100 transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp</span>
            </a>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-slate-100 text-slate-400 font-semibold text-xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
          )}

          {emailLink ? (
            <a
              href={emailLink}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 font-semibold text-xs hover:bg-blue-100 transition-colors"
            >
              <Mail className="w-4 h-4 text-blue-600" />
              <span>E-mail</span>
            </a>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-slate-100 text-slate-400 font-semibold text-xs"
            >
              <Mail className="w-4 h-4" />
              <span>E-mail</span>
            </button>
          )}
        </div>

        {/* Botão de Destaque: Registrar Tentativa */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full py-3 px-4 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center gap-2"
        >
          <Clock className="w-4 h-4" />
          <span>Registrar Contato / Tentativa</span>
        </button>
      </div>

      {/* Próxima Ação Agendada */}
      {lead.next_action !== "nenhuma" && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Próxima Ação Agendada
            </span>
            <p className="text-xs font-semibold text-amber-900 capitalize">
              {lead.next_action}:{" "}
              {lead.next_action_at
                ? new Date(lead.next_action_at).toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Imediata"}
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-2xs"
          >
            Registrar Agora
          </button>
        </div>
      )}

      {/* Contatos & Decisor */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <User className="w-4 h-4 text-slate-400" />
          <span>Contatos da Empresa</span>
        </h2>

        {contacts && contacts.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {contacts.map((c: any) => (
              <div key={c.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{c.name}</span>
                    {c.is_decision_maker && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-blue-100 text-blue-800">
                        Decisor
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500">{c.role_title || "Sem cargo"}</span>
                </div>
                <div className="flex items-center gap-2">
                  {c.phone_e164 && (
                    <a
                      href={`tel:${c.phone_e164}`}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Nenhum contato específico cadastrado ainda.</p>
        )}
      </div>

      {/* Histórico / Linha do Tempo de Tentativas */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>Histórico de Contatos ({attempts.length})</span>
        </h2>

        {attempts && attempts.length > 0 ? (
          <div className="space-y-3">
            {attempts.map((att: any) => (
              <div
                key={att.id}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 capitalize">
                    {att.channel}: {att.outcome.replace(/_/g, " ")}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(att.occurred_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {att.reached_decision_maker && (
                  <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Falou com o Decisor
                  </span>
                )}

                {att.notes && (
                  <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                    {att.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Nenhuma tentativa realizada ainda.</p>
        )}
      </div>

      {/* Modal de Registro de Tentativa */}
      <AttemptModal
        leadId={lead.id}
        companyName={company.name}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
