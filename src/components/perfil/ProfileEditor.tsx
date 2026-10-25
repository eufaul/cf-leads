"use client";

import { useState } from "react";
import { updateProfileDetailsAction, updatePasswordAction } from "@/server/actions/profile";
import { User, Building2, Lock, CheckCircle2, AlertCircle, Phone, Mail, MapPin, Shield, KeyRound, Save } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProfileEditorProps {
  initialData: {
    fullName: string;
    companyName: string;
    email: string;
    phone: string;
    companyAddress: string;
    role: string;
  };
}

export function ProfileEditor({ initialData }: ProfileEditorProps) {
  const router = useRouter();

  // Estados dos Dados Cadastrais
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsSuccess, setDetailsSuccess] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Estados da Senha
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleDetailsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDetailsLoading(true);
    setDetailsError(null);
    setDetailsSuccess(null);

    const formData = new FormData(e.currentTarget);
    const res = await updateProfileDetailsAction(formData);

    if (res.error) {
      setDetailsError(res.error);
      setDetailsLoading(false);
    } else {
      setDetailsLoading(false);
      setDetailsSuccess(res.message || "Dados atualizados com sucesso!");
      router.refresh();
      setTimeout(() => setDetailsSuccess(null), 5000);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const res = await updatePasswordAction(formData);

    if (res.error) {
      setPasswordError(res.error);
      setPasswordLoading(false);
    } else {
      setPasswordLoading(false);
      setPasswordSuccess(res.message || "Senha alterada com sucesso!");
      form.reset();
      setTimeout(() => setPasswordSuccess(null), 5000);
    }
  }

  // Iniciais para o Avatar
  const initials = initialData.fullName
    ? initialData.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CF";

  return (
    <div className="space-y-6">
      {/* Card de Resumo do Perfil */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20">
              {initials}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {initialData.fullName || "Usuário"}
                </h1>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  {initialData.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{initialData.companyName || "Agência C&F"}</span>
                <span>•</span>
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{initialData.email}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Seção 1: Dados do Usuário & Empresa */}
      <form onSubmit={handleDetailsSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Dados do Perfil e da Empresa</h2>
          </div>
          <span className="text-[11px] text-slate-400">Edição instantânea</span>
        </div>

        {detailsError && (
          <div className="flex items-start gap-2 p-3 text-xs rounded-xl bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{detailsError}</span>
          </div>
        )}

        {detailsSuccess && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{detailsSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Nome Completo */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Nome Completo *</span>
            </label>
            <input
              type="text"
              name="fullName"
              defaultValue={initialData.fullName}
              required
              placeholder="Ex: Faul Correia"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
            />
          </div>

          {/* Nome da Empresa */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Nome da Empresa / Agência *</span>
            </label>
            <input
              type="text"
              name="companyName"
              defaultValue={initialData.companyName}
              required
              placeholder="Ex: Agência C&F — Correia e Fagundes"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
            />
          </div>

          {/* E-mail */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>E-mail de Acesso *</span>
            </label>
            <input
              type="email"
              name="email"
              defaultValue={initialData.email}
              required
              placeholder="seuemail@agenciacf.com.br"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
            />
            <span className="text-[10px] text-slate-400">
              Se alterar o e-mail, será enviada uma confirmação para o novo endereço.
            </span>
          </div>

          {/* Telefone */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Telefone / WhatsApp</span>
            </label>
            <input
              type="text"
              name="phone"
              defaultValue={initialData.phone}
              placeholder="Ex: (19) 99999-9999"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
            />
          </div>

          {/* Endereço da Empresa */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="font-semibold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Endereço Completo da Empresa</span>
            </label>
            <input
              type="text"
              name="companyAddress"
              defaultValue={initialData.companyAddress}
              placeholder="Ex: Av. Presidente Vargas, 1000 - Centro, Indaiatuba/SP - CEP 13330-000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={detailsLoading}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-2xs disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{detailsLoading ? "Salvando..." : "Salvar Alterações"}</span>
          </button>
        </div>
      </form>

      {/* Seção 2: Segurança & Alteração de Senha */}
      <form onSubmit={handlePasswordSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900">Segurança & Alteração de Senha</h2>
          </div>
          <span className="text-[11px] text-slate-400">Proteção de acesso</span>
        </div>

        {passwordError && (
          <div className="flex items-start gap-2 p-3 text-xs rounded-xl bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>Nova Senha *</span>
            </label>
            <input
              type="password"
              name="newPassword"
              required
              minLength={6}
              placeholder="Digite no mínimo 6 caracteres"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>Confirmar Nova Senha *</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={6}
              placeholder="Repita a nova senha"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-slate-500">
            A senha deve ter pelo menos 6 caracteres. Recomendamos usar letras, números e símbolos.
          </p>
          <button
            type="submit"
            disabled={passwordLoading}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shadow-2xs disabled:opacity-60"
          >
            <Shield className="w-3.5 h-3.5 text-slate-700" />
            <span>{passwordLoading ? "Atualizando..." : "Atualizar Senha"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
