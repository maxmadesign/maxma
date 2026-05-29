"""Simulation Engine Service — marks open positions to market and triggers stop-loss /
take-profit / trailing-stop between decision rounds. Heartbeats in demo mode."""
from __future__ import annotations

import time

from tradepilot.state import get_arena


def main() -> None:
    arena = get_arena()
    print("[simulation-engine] online", flush=True)
    while True:
        if arena.global_state.simulation_running:
            prices = arena._current_prices()
            for account in arena.accounts.values():
                arena.broker.mark_and_check_exits(account, prices)
        time.sleep(15)


if __name__ == "__main__":
    main()
