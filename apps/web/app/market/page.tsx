"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, CardBody, Skeleton } from "@/components/ui/Card";
import { CandlestickChart } from "@/components/CandlestickChart";

const SYMBOLS = ["SPY", "QQQ", "IWM", "AAPL", "MSFT", "NVDA", "TSLA"];
const TFS = ["1m", "5m", "15m", "1h", "1d"];

export default function MarketPage() {
  const { t } = useI18n();
  const [symbol, setSymbol] = useState("SPY");
  const [tf, setTf] = useState("5m");
  const { data: bars, isLoading } = useQuery({ queryKey: ["bars", symbol, tf], queryFn: () => api.bars(symbol, tf) });

  return (
    <div>
      <PageHeader title={t("nav.market")} />
      <Card>
        <CardHeader
          title={`${symbol} · ${tf}`}
          action={
            <div className="flex gap-2">
              <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="rounded-lg border border-border bg-surface px-2 py-1 text-xs">
                {SYMBOLS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <div className="flex gap-1">
                {TFS.map((x) => <button key={x} onClick={() => setTf(x)} className={`rounded px-2 py-1 text-xs ${tf === x ? "bg-accent text-white" : "hover:bg-surface-2"}`}>{x}</button>)}
              </div>
            </div>
          }
        />
        <CardBody>{isLoading || !bars ? <Skeleton className="h-[420px] w-full" /> : <CandlestickChart bars={bars} height={460} />}</CardBody>
      </Card>
    </div>
  );
}
