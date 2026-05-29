"""Broker abstraction. PaperBroker is fully implemented; IBKR/Robinhood are disabled stubs.

The browser must NEVER call a broker directly. Live trading is disabled by default.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

from tradepilot.domain import Account, Fill, Order, Position


@dataclass
class FillResult:
    order: Order
    fill: Optional[Fill] = None
    closed_trade_pnl: float = 0.0


class BrokerBase(ABC):
    is_paper: bool = True
    live_enabled: bool = False

    @abstractmethod
    def place_order(self, account: Account, order: Order) -> FillResult: ...

    @abstractmethod
    def cancel_order(self, account: Account, order_id: str) -> bool: ...

    @abstractmethod
    def get_positions(self, account: Account) -> list[Position]: ...

    @abstractmethod
    def get_open_orders(self, account: Account) -> list[Order]: ...

    @abstractmethod
    def get_account_summary(self, account: Account) -> dict: ...


class _DisabledBrokerStub(BrokerBase):
    """Safe stub for future real brokers. Always raises — live trading disabled by default."""

    name = "disabled"
    is_paper = False
    live_enabled = False

    def _blocked(self):
        raise RuntimeError(
            f"{self.name} broker is a disabled stub. Real trading is OFF by default "
            "(LIVE_TRADING_ENABLED=false). This is a future-extension interface only."
        )

    def place_order(self, account, order):  # noqa: D102
        self._blocked()

    def cancel_order(self, account, order_id):
        self._blocked()

    def get_positions(self, account):
        self._blocked()

    def get_open_orders(self, account):
        self._blocked()

    def get_account_summary(self, account):
        self._blocked()


class IBKRBroker(_DisabledBrokerStub):
    """Interactive Brokers — future extension. Disabled stub; documented in docs/safety.md."""

    name = "ibkr"


class RobinhoodBroker(_DisabledBrokerStub):
    """Robinhood — future extension. Disabled stub. Uses ONLY official APIs if ever enabled;
    no unofficial/private APIs."""

    name = "robinhood"
