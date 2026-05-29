"""Minimal backtest engine.

Supports a strategy-only backtest over synthetic or CSV-replay bars. Produces the standard
metrics (total return, max drawdown, win rate, profit factor, expectancy, #trades).
Agent-decision replay and market replay are future extensions (documented stubs).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from tradepilot.indicators import ema, rsi, vwap
from tradepilot.marketdata.synthetic import SyntheticMarketDataProvider


@dataclass
class BacktestResult:
    strategy: str
    symbol: str
    total_return_pct: float
    max_drawdown_pct: float
    win_rate: float
    profit_factor: float
    expectancy: float
    num_trades: int
    equity_curve: list[float] = field(default_factory=list)


def run_strategy_backtest(strategy: str = "vwap_momentum", symbol: str = "SPY",
                          bars=None, starting_equity: float = 10_000.0) -> BacktestResult:
    if bars is None:
        bars = SyntheticMarketDataProvider().get_bars(symbol, "5m", 300)

    equity = starting_equity
    peak = equity
    max_dd = 0.0
    in_pos = False
    entry = 0.0
    pnls: list[float] = []
    curve: list[float] = [equity]

    closes = [b.close for b in bars]
    for i in range(50, len(bars)):
        window = bars[: i + 1]
        c = closes[i]
        vw = vwap(window[-30:]) or c
        e20 = ema(closes[: i + 1][-60:], 20) or c
        e50 = ema(closes[: i + 1][-60:], 50) or c
        r = rsi(closes[: i + 1], 14) or 50

        long_signal = c > vw and e20 > e50 and 50 <= r <= 72
        if not in_pos and long_signal:
            in_pos, entry = True, c
        elif in_pos and (c < vw or r > 75):
            pnl = (c - entry) / entry * (equity * 0.25)  # 25% notional position
            equity += pnl
            pnls.append(pnl)
            in_pos = False
        curve.append(equity)
        peak = max(peak, equity)
        max_dd = max(max_dd, (peak - equity) / peak if peak else 0)

    wins = [p for p in pnls if p > 0]
    losses = [-p for p in pnls if p < 0]
    pf = (sum(wins) / sum(losses)) if losses else (float("inf") if wins else 0.0)
    return BacktestResult(
        strategy=strategy, symbol=symbol,
        total_return_pct=round((equity - starting_equity) / starting_equity * 100, 2),
        max_drawdown_pct=round(max_dd * 100, 2),
        win_rate=round(len(wins) / len(pnls) * 100, 1) if pnls else 0.0,
        profit_factor=round(pf, 2) if pf != float("inf") else float("inf"),
        expectancy=round(sum(pnls) / len(pnls), 2) if pnls else 0.0,
        num_trades=len(pnls), equity_curve=[round(x, 2) for x in curve],
    )
