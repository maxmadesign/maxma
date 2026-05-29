"use client";
import { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, CandlestickData, LineData, Time } from "lightweight-charts";
import { useTheme } from "next-themes";

type Marker = { time: number; position: "aboveBar" | "belowBar"; color: string; shape: "arrowUp" | "arrowDown"; text: string; decisionId?: string };

export function CandlestickChart({
  bars, vwap, ema20, ema50, markers, onMarkerClick, height = 420,
}: {
  bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[];
  vwap?: LineData[]; ema20?: LineData[]; ema50?: LineData[];
  markers?: Marker[]; onMarkerClick?: (decisionId: string) => void; height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!ref.current) return;
    const dark = resolvedTheme === "dark";
    const chart = createChart(ref.current, {
      height,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: dark ? "#94a3b8" : "#475569" },
      grid: { vertLines: { color: dark ? "#1e293b" : "#e2e8f0" }, horzLines: { color: dark ? "#1e293b" : "#e2e8f0" } },
      crosshair: { mode: 1 },
      timeScale: { timeVisible: true, borderColor: dark ? "#334155" : "#cbd5e1" },
      rightPriceScale: { borderColor: dark ? "#334155" : "#cbd5e1" },
    });
    chartRef.current = chart;

    const candle = chart.addCandlestickSeries({
      upColor: "#10b981", downColor: "#f43f5e", borderVisible: false,
      wickUpColor: "#10b981", wickDownColor: "#f43f5e",
    });
    candle.setData(bars.map((b) => ({ time: b.time as Time, open: b.open, high: b.high, low: b.low, close: b.close })) as CandlestickData[]);

    const volume = chart.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "" });
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volume.setData(bars.map((b) => ({ time: b.time as Time, value: b.volume, color: b.close >= b.open ? "#10b98155" : "#f43f5e55" })) as any);

    if (vwap?.length) chart.addLineSeries({ color: "#a855f7", lineWidth: 1, title: "VWAP" }).setData(vwap);
    if (ema20?.length) chart.addLineSeries({ color: "#3b82f6", lineWidth: 1, title: "EMA20" }).setData(ema20);
    if (ema50?.length) chart.addLineSeries({ color: "#f59e0b", lineWidth: 1, title: "EMA50" }).setData(ema50);

    if (markers?.length) {
      candle.setMarkers(markers.map((m) => ({ time: m.time as Time, position: m.position, color: m.color, shape: m.shape, text: m.text })));
    }
    if (onMarkerClick) {
      chart.subscribeClick((param) => {
        if (!param.time) return;
        const m = markers?.find((mk) => mk.time === param.time);
        if (m?.decisionId) onMarkerClick(m.decisionId);
      });
    }

    chart.timeScale().fitContent();
    const onResize = () => chart.applyOptions({ width: ref.current?.clientWidth });
    onResize();
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); chart.remove(); };
  }, [bars, vwap, ema20, ema50, markers, resolvedTheme, height, onMarkerClick]);

  return <div ref={ref} className="w-full" />;
}
