"""Synthetic market data — deterministic random-walk generator for demo & dev.

Produces realistic-looking OHLCV bars, quotes with spreads, and a simple options chain so
the whole arena (including options exposure) can be demonstrated with no real data key.
"""
from __future__ import annotations

import math
import random
from datetime import datetime, timedelta, timezone

from tradepilot.domain import Bar, Quote
from tradepilot.marketdata.base import MarketDataProvider

_BASE_PRICES = {
    "SPY": 560.0, "QQQ": 490.0, "IWM": 220.0, "AAPL": 230.0, "MSFT": 430.0,
    "NVDA": 135.0, "AMD": 165.0, "META": 580.0, "AMZN": 200.0, "TSLA": 250.0,
    "GOOGL": 175.0, "NFLX": 700.0, "AVGO": 175.0,
}


class SyntheticMarketDataProvider(MarketDataProvider):
    name = "synthetic"

    def __init__(self, seed: int = 42, options_available: bool = True) -> None:
        self.seed = seed
        self.options_available = options_available

    def _series(self, symbol: str, n: int, timeframe: str) -> list[Bar]:
        base = _BASE_PRICES.get(symbol, 100.0)
        rng = random.Random(hash((symbol, self.seed)) & 0xFFFFFFFF)
        step = {"1m": 1, "5m": 5, "15m": 15, "1h": 60, "1d": 390}.get(timeframe, 5)
        now = datetime.now(timezone.utc)
        bars: list[Bar] = []
        price = base
        for i in range(n):
            t = now - timedelta(minutes=step * (n - i))
            drift = math.sin(i / 8.0) * base * 0.001
            shock = rng.uniform(-1, 1) * base * 0.004
            o = price
            c = max(1.0, o + drift + shock)
            h = max(o, c) * (1 + abs(rng.uniform(0, 0.003)))
            l = min(o, c) * (1 - abs(rng.uniform(0, 0.003)))
            v = rng.uniform(0.8, 2.0) * 1_000_000
            bars.append(Bar(time=t, open=round(o, 2), high=round(h, 2),
                            low=round(l, 2), close=round(c, 2), volume=round(v)))
            price = c
        return bars

    def get_bars(self, symbol: str, timeframe: str = "5m", limit: int = 100) -> list[Bar]:
        return self._series(symbol, limit, timeframe)

    def get_quote(self, symbol: str) -> Quote:
        bars = self._series(symbol, 30, "1m")
        last = bars[-1].close
        spread = last * 0.0003
        return Quote(
            symbol=symbol, price=round(last, 2),
            bid=round(last - spread / 2, 2), ask=round(last + spread / 2, 2),
            spread_bps=round((spread / last) * 10_000, 2),
            volume=bars[-1].volume, timestamp=datetime.now(timezone.utc), stale_seconds=0.5,
        )

    def get_options_chain(self, symbol: str) -> dict:
        if not self.options_available:
            return {}
        q = self.get_quote(symbol)
        spot = q.price
        rng = random.Random(hash((symbol, "opt", self.seed)) & 0xFFFFFFFF)
        contracts = []
        for dte in (7, 14, 30):
            exp = (datetime.now(timezone.utc) + timedelta(days=dte)).date().isoformat()
            for k_off in (-0.05, 0, 0.05):
                strike = round(spot * (1 + k_off), 1)
                for typ in ("call", "put"):
                    mid = round(max(0.2, spot * (0.01 + abs(k_off) * 0.3) + rng.uniform(0, 1)), 2)
                    contracts.append({
                        "underlying": symbol, "type": typ, "strike": strike,
                        "expiration": exp, "dte": dte,
                        "bid": round(mid * 0.97, 2), "ask": round(mid * 1.03, 2),
                        "mid": mid, "implied_volatility": round(0.2 + rng.uniform(0, 0.4), 3),
                    })
        return {"underlying": symbol, "spot": spot, "contracts": contracts}
