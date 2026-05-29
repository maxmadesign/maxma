"use client";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Play, Pause, Settings as SettingsIcon } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { KillSwitchButton } from "./KillSwitchButton";
import { cn } from "@/lib/utils";

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function marketSession(et: Date): "open" | "premarket" | "afterhours" | "closed" {
  const day = et.getDay();
  if (day === 0 || day === 6) return "closed";
  const mins = et.getHours() * 60 + et.getMinutes();
  if (mins >= 4 * 60 && mins < 9 * 60 + 30) return "premarket";
  if (mins >= 9 * 60 + 30 && mins < 16 * 60) return "open";
  if (mins >= 16 * 60 && mins < 20 * 60) return "afterhours";
  return "closed";
}

export function TopBar() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const now = useClock();
  const { data: status } = useQuery({ queryKey: ["sim-status"], queryFn: api.simulationStatus });

  const etStr = now.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour12: false });
  const etDate = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const session = marketSession(etDate);
  const running = status?.running;
  const killed = status?.kill_switch;

  const sessionColor: Record<string, string> = {
    open: "text-emerald-500", premarket: "text-sky-500", afterhours: "text-amber-500", closed: "text-slate-400",
  };

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border bg-bg/80 px-4 py-2.5 backdrop-blur lg:px-6">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{t("app.name")}</span>
        <span className="rounded-md bg-sky-500/12 px-2 py-0.5 text-[11px] font-medium text-sky-600 ring-1 ring-sky-500/30 dark:text-sky-400">
          {t("mode.simulation")}
        </span>
        <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1",
          killed ? "bg-red-950 text-red-300 ring-red-500/60"
            : running ? "bg-emerald-500/12 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400"
              : "bg-slate-500/12 text-slate-500 ring-slate-500/30")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", running && !killed ? "bg-emerald-500 animate-pulseSoft" : "bg-slate-400")} />
          {killed ? "KILL_SWITCH" : running ? t("sim.running") : t("sim.stopped")}
        </span>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-muted">
        <span>
          {t("market.regime")}: <span className={cn("font-medium", sessionColor[session])}>{t(`market.${session}`)}</span>
        </span>
        <span className="tnum">{t("common.etTime")} {etStr}</span>
        <span className="tnum hidden sm:inline">{t("common.localTime")} {now.toLocaleTimeString()}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={async () => { running ? await api.pause() : await api.start(); qc.invalidateQueries(); }}
          className={cn("inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium",
            running ? "border border-border bg-surface hover:bg-surface-2" : "bg-emerald-600 text-white hover:bg-emerald-700")}
        >
          {running ? <Pause size={15} /> : <Play size={15} />}
          {running ? t("sim.pause") : t("sim.start")}
        </button>
        <ThemeToggle />
        <LanguageToggle />
        <Link href="/settings" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-2">
          <SettingsIcon size={16} />
        </Link>
        <KillSwitchButton active={!!killed} />
      </div>
    </header>
  );
}
