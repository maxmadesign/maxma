"""Market Data Service — produces/refreshes quotes & bars.

In demo mode this is the SyntheticMarketDataProvider; it would publish snapshots to Redis
in a production build. Here it simply heartbeats so the service stays healthy.
"""
from __future__ import annotations

import time

from tradepilot.marketdata.synthetic import SyntheticMarketDataProvider
from tradepilot.strategy import DEFAULT_WATCHLIST


def main() -> None:
    provider = SyntheticMarketDataProvider()
    print("[market-data] synthetic provider online", flush=True)
    while True:
        snapshot = provider.get_snapshot(DEFAULT_WATCHLIST)
        spy = snapshot.get("SPY")
        if spy:
            print(f"[market-data] SPY={spy.price} spread={spy.spread_bps}bps", flush=True)
        time.sleep(30)


if __name__ == "__main__":
    main()
