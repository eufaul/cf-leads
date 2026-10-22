"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PhoneCall, Layers, Users, LayoutGrid, PlusCircle } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  const navItems = [
    { label: "Hoje", href: "/hoje", icon: PhoneCall },
    { label: "Lote", href: "/lote", icon: Layers },
    { label: "Novo", href: "/leads/novo", icon: PlusCircle, isPrimary: true },
    { label: "Leads", href: "/leads", icon: Users },
    { label: "Pipeline", href: "/pipeline", icon: LayoutGrid },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 safe-bottom md:hidden shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/40 hover:bg-blue-700 transition-colors">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold text-blue-600 mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                isActive ? "text-blue-600 font-semibold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
