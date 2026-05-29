"""MarketDataProvider abstraction.

Implementations: SyntheticMarketDataProvider (demo/dev), CsvReplayMarketDataProvider
(backtest/replay), and disabled stubs for IBKR / external vendors (Polygon/IEX/Alpaca).
The app must run with no real market-data key via synthetic or replay data.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

from tradepilot.domain import Bar, Quote


class MarketDataProvider(ABC):
    name: str = "base"

    @abstractmethod
    def get_quote(self, symbol: str) -> Quote: ...

    @abstractmethod
    def get_bars(self, symbol: str, timeframe: str = "5m", limit: int = 100) -> list[Bar]: ...

    def get_snapshot(self, symbols: list[str]) -> dict[str, Quote]:
        return {s: self.get_quote(s) for s in symbols}

    def get_options_chain(self, symbol: str) -> dict:
        """Return {} when options data is unavailable; agents must then skip options."""
        return {}

    def subscribe_quotes(self, symbols: list[str]):  # pragma: no cover - sync demo
        return None

    def health_check(self) -> dict:
        return {"provider": self.name, "status": "ok"}


class IBKRMarketDataProvider(MarketDataProvider):
    """Future real-data stub. Disabled by default."""

    name = "ibkr"

    def get_quote(self, symbol: str) -> Quote:
        raise RuntimeError("IBKR market data is a disabled stub in this build.")

    def get_bars(self, symbol: str, timeframe: str = "5m", limit: int = 100):
        raise RuntimeError("IBKR market data is a disabled stub in this build.")


class ExternalVendorPlaceholder(MarketDataProvider):
    """Placeholder for Polygon / IEX / Alpaca. Not required; no real key forced."""

    name = "external"

    def get_quote(self, symbol: str) -> Quote:
        raise RuntimeError("External market-data vendor not configured (optional).")

    def get_bars(self, symbol: str, timeframe: str = "5m", limit: int = 100):
        raise RuntimeError("External market-data vendor not configured (optional).")
