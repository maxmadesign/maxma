#!/usr/bin/env python3
"""Seed the in-memory Arena with demo decisions/trades/equity by running mock rounds.

In demo mode the API seeds automatically on first access; this script is for inspecting
the seeded leaderboard from the CLI.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from tradepilot.arena import Arena  # noqa: E402


def main() -> None:
    arena = Arena()
    arena.start()
    for _ in range(40):
        arena.run_round(market_open=True)
    print(json.dumps(arena.leaderboard(), indent=2, ensure_ascii=False))
    print(f"\nDecisions: {len(arena.decisions)} · Trades: {len(arena.broker.trades)} · "
          f"Risk events: {len(arena.risk_events)} · Cost: ${arena.total_cost():.4f}")


if __name__ == "__main__":
    main()
