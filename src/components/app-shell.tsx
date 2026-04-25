"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bot,
  ChartPie,
  HandCoins,
  Inbox,
  Plus,
  Settings2,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: ChartPie },
  { href: "/manual", label: "Cargar", icon: Plus },
  { href: "/splits", label: "Splits", icon: HandCoins },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/rules", label: "Reglas", icon: Settings2 },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-stone-200 bg-[#fbfaf6] px-5 py-6 lg:block">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#10231c] text-[#d7f36d]">
            <WalletCards size={22} />
          </div>
          <div>
            <p className="text-base font-semibold">Gastos de Benja</p>
            <p className="text-xs text-stone-500">MP, efectivo y splits</p>
          </div>
        </Link>

        <nav className="mt-8 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-stone-600 transition",
                  active && "bg-[#10231c] text-white shadow-sm",
                  !active && "hover:bg-stone-100 hover:text-stone-950",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-5 bottom-6 rounded-lg border border-stone-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Bot size={17} />
            Telegram primero
          </div>
          <p className="mt-2 text-xs leading-5 text-stone-500">
            La web queda como trastienda para editar, revisar y resolver casos complejos.
          </p>
        </div>
      </aside>

      <header className="sticky top-0 z-10 border-b border-stone-200 bg-[#fbfaf6]/95 px-4 py-3 backdrop-blur lg:ml-72 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="lg:hidden">
            <p className="font-semibold">Gastos de Benja</p>
            <p className="text-xs text-stone-500">MP + efectivo</p>
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Abril 2026</p>
            <p className="text-sm text-stone-600">Mes calendario, saldo limpio y gastos post-split.</p>
          </div>
          <button className="inline-flex size-10 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 shadow-sm" aria-label="Alertas">
            <Bell size={18} />
          </button>
        </div>
      </header>

      <main className="px-4 py-6 lg:ml-72 lg:px-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-stone-200 bg-white lg:hidden">
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-stone-500", active && "text-[#10231c]")}
            >
              <Icon size={19} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="h-16 lg:hidden" />
    </div>
  );
}
