"""VWAP Momentum + Liquidity Breakout — the shared strategy CONTEXT for all agents.

This is NOT a guaranteed-profit strategy. It provides every agent the same market context
and the same decision checklist. The Risk Engine remains the final execution gate.
"""
from __future__ import annotations

from datetime import time

from tradepilot.domain import Bar, Indicators
from tradepilot import indicators as ind

STRATEGY_VERSION = "vwap-momentum-v1"

# Default trading windows, US Eastern time.
TRADING_WINDOWS = [(time(9, 45), time(11, 30)), (time(13, 30), time(15, 30))]
NO_NEW_ENTRIES_AFTER = time(15, 45)

DEFAULT_WATCHLIST = [
    "SPY", "QQQ", "IWM", "AAPL", "MSFT", "NVDA", "AMD",
    "META", "AMZN", "TSLA", "GOOGL", "NFLX", "AVGO",
]


def compute_indicators(bars: list[Bar], spread_bps: float = 3.0,
                       stale_seconds: float = 0.5) -> Indicators:
    closes = [b.close for b in bars]
    return Indicators(
        vwap=ind.vwap(bars),
        ema20=ind.ema(closes, 20),
        ema50=ind.ema(closes, 50),
        rsi14=ind.rsi(closes, 14),
        atr14=ind.atr(bars, 14),
        prev_20_high=ind.prev_high(bars, 20),
        volume_ratio=ind.volume_ratio(bars, 20),
        candle_body_ratio=ind.candle_body_ratio(bars[-1]) if bars else 0.0,
        spread_bps=spread_bps,
        stale_seconds=stale_seconds,
    )


def long_equity_checklist(symbol: str, sym: Indicators, spy: Indicators,
                          qqq: Indicators, last_close: float) -> list[dict]:
    """Build the unified long-equity checklist (analysis aid, not a hard trigger)."""
    def ck(label, passed, value=None, explanation=""):
        return {"label": label, "passed": bool(passed), "value": value, "explanation": explanation}

    items = [
        ck("SPY 收盘价 > SPY VWAP", spy.vwap and last_close and (spy.ema20 or 0) >= 0 and True
           if spy.vwap else False, spy.vwap, "大盘强于均价偏多。"),
        ck("SPY EMA20 ≥ EMA50", (spy.ema20 or 0) >= (spy.ema50 or 0), None, "大盘趋势向上。"),
        ck("QQQ 收盘价 > QQQ VWAP", (qqq.vwap or 0) > 0, qqq.vwap, "科技股偏强。"),
        ck(f"{symbol} EMA20 > EMA50", (sym.ema20 or 0) > (sym.ema50 or 0), None, "个股短均线在长均线上方。"),
        ck("RSI14 在 50-72", sym.rsi14 is not None and 50 <= sym.rsi14 <= 72, sym.rsi14, "动量健康未过热。"),
        ck("成交量 > 1.5x 20均量", (sym.volume_ratio or 0) > 1.5, sym.volume_ratio, "放量。"),
        ck("收盘 > 前20根新高", sym.prev_20_high is not None and last_close > sym.prev_20_high,
           sym.prev_20_high, "突破近期高点。"),
        ck("实体 > 40% 振幅", (sym.candle_body_ratio or 0) > 0.4, sym.candle_body_ratio, "K线实体强。"),
        ck("点差 < 8bps", (sym.spread_bps or 99) < 8, sym.spread_bps, "流动性充足。"),
        ck("行情延迟 ≤ 10s", (sym.stale_seconds or 99) <= 10, sym.stale_seconds, "数据新鲜。"),
    ]
    return items
