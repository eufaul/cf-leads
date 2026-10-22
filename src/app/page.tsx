import Link from "next/link";
import { PhoneCall, ShieldCheck, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
          <PhoneCall className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">CF Leads</h1>
          <p className="text-sm text-slate-600">
            Sistema de Prospecção Ativa da Agência C&F
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3 text-left">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-800">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Fundação M1 Inicializada com Sucesso</span>
          </div>
          <p className="text-xs text-slate-500">
            Next.js App Router, TypeScript, Tailwind CSS e pipeline de segurança configurados.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            Acessar Sistema
          </Link>
        </div>
      </div>
    </main>
  );
}
