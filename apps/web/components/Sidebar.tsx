"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Bot, LineChart, Wallet, ListOrdered, History,
  ScrollText, ShieldAlert, FlaskConical, FileText, Settings,
} from "lucide-react";

const ITEMS = [
  { href: "/", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/agents", key: "nav.agents", icon: Bot },
  { href: "/market", key: "nav.market", icon: LineChart },
  { href: "/positions", key: "nav.positions", icon: Wallet },
  { href: "/orders", key: "nav.orders", icon: ListOrdered },
  { href: "/trades", key: "nav.trades", icon: History },
  { href: "/decisions", key: "nav.decisions", icon: ScrollText },
  { href: "/risk", key: "nav.risk", icon: ShieldAlert },
  { href: "/backtests", key: "nav.backtests", icon: FlaskConical },
  { href: "/reports", key: "nav.reports", icon: FileText },
  { href: "/settings", key: "nav.settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex items-center gap-2 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 text-sm font-bold text-white">TP</div>
        <div>
          <div className="text-sm font-semibold leading-tight">TradePilot</div>
          <div className="text-[10px] uppercase tracking-wider text-muted">Arena</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {ITEMS.map(({ href, key, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-accent/10 font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-fg",
              )}>
              <Icon size={16} />
              {t(key)}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border px-4 py-3 text-[10px] leading-relaxed text-muted">
        {t("common.disclaimer")}
      </div>
    </aside>
  );
}
