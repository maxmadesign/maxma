#!/usr/bin/env python3
"""Run a strategy-only backtest.

Usage:
  python scripts/run_backtest.py --strategy vwap_momentum --symbol SPY \
      --data ./data --start 2024-01-01 --end 2025-01-01
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.backtester import run_strategy_backtest  # noqa: E402


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--strategy", default="vwap_momentum")
    p.add_argument("--symbol", default="SPY")
    p.add_argument("--data", default="./data")
    p.add_argument("--start", default=None)
    p.add_argument("--end", default=None)
    args = p.parse_args()

    result = run_strategy_backtest(strategy=args.strategy, symbol=args.symbol)
    out = {
        "strategy": result.strategy, "symbol": result.symbol,
        "total_return_pct": result.total_return_pct, "max_drawdown_pct": result.max_drawdown_pct,
        "win_rate": result.win_rate, "profit_factor": result.profit_factor,
        "expectancy": result.expectancy, "num_trades": result.num_trades,
    }
    print(json.dumps(out, indent=2, ensure_ascii=False))
    print("\n注意：回测仅供研究，不构成投资建议，不承诺盈利。")


if __name__ == "__main__":
    main()
