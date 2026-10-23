import Link from "next/link";
import { PhoneCall, LogOut, Settings, BarChart2 } from "lucide-react";
import { logoutAction } from "@/server/actions/auth";

export function TopHeader({ userEmail }: { userEmail?: string | null }) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200">
      <div className="flex items-center justify-between h-14 px-4 max-w-5xl mx-auto">
        <Link href="/hoje" className="flex items-center gap-2 font-bold text-slate-900 tracking-tight">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shadow-sm">
            <PhoneCall className="w-4 h-4" />
          </div>
          <span>CF Leads</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-50 text-blue-700 border border-blue-200">
            C&F
          </span>
        </Link>

        {/* Links desktop */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/hoje" className="hover:text-blue-600 transition-colors">
            Hoje
          </Link>
          <Link href="/lote" className="hover:text-blue-600 transition-colors">
            Lote da Semana
          </Link>
          <Link href="/leads" className="hover:text-blue-600 transition-colors">
            Leads
          </Link>
          <Link href="/buscar" className="hover:text-blue-600 transition-colors">
            Buscar no Maps
          </Link>
          <Link href="/pipeline" className="hover:text-blue-600 transition-colors">
            Pipeline
          </Link>
          <Link href="/relatorios" className="hover:text-blue-600 transition-colors flex items-center gap-1">
            <BarChart2 className="w-4 h-4" /> Relatórios
          </Link>
          <Link href="/config" className="hover:text-blue-600 transition-colors flex items-center gap-1">
            <Settings className="w-4 h-4" /> Config
          </Link>
        </nav>

        {/* Usuário e Logout */}
        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="hidden sm:inline text-xs font-medium text-slate-500">
              {userEmail}
            </span>
          )}
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sair"
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
