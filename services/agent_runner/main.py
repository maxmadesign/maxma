"""Agent Runner — the always-on background worker.

Every interval during market hours it builds ONE fair market snapshot and runs a decision
round for all enabled agents (mock LLMs in demo mode). One provider failing never blocks
the others. Runs forever with restart: unless-stopped.

NOTE: This MVP worker drives its own in-process Arena (shared demo state via tradepilot.state).
In a production build the runner and API would share state via Postgres/Redis.
"""
from __future__ import annotations

import time
from datetime import datetime
from zoneinfo import ZoneInfo

from tradepilot.config import get_settings
from tradepilot.state import get_arena
from tradepilot.strategy import NO_NEW_ENTRIES_AFTER, TRADING_WINDOWS

ET = ZoneInfo("America/New_York")


def in_trading_window(now_et: datetime) -> bool:
    if now_et.weekday() >= 5:
        return False
    t = now_et.time()
    return any(start <= t <= end for start, end in TRADING_WINDOWS)


def main() -> None:
    settings = get_settings()
    arena = get_arena()
    arena.start()
    interval = settings.decision_interval_seconds
    print(f"[agent-runner] started · interval={interval}s · demo={settings.demo_mode}", flush=True)

    while True:
        now_et = datetime.now(ET)
        open_now = in_trading_window(now_et) or settings.demo_mode
        if open_now and arena.global_state.simulation_running:
            try:
                result = arena.run_round(market_open=True)
                print(f"[agent-runner] round {result['snapshot_id'][:8]} · "
                      f"{result['decisions']} decisions @ {now_et:%H:%M:%S} ET", flush=True)
            except Exception as e:  # never crash the loop
                print(f"[agent-runner] round error: {e}", flush=True)
        time.sleep(interval)


if __name__ == "__main__":
    main()
