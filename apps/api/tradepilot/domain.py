"""Runtime domain models for the simulation: accounts, positions, orders, market data.

These are in-memory Pydantic models used by the engines and the in-memory demo store.
The persistent DB schema mirrors them (see tradepilot/db/models.py).
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from tradepilot.schemas.enums import (
    AssetType,
    OptionType,
    OrderSide,
    OrderStatus,
    OrderType,
)


class Quote(BaseModel):
    symbol: str
    price: float
    bid: float
    ask: float
    spread_bps: float = 0.0
    volume: float = 0.0
    timestamp: datetime
    stale_seconds: float = 0.0


class Bar(BaseModel):
    time: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


class Indicators(BaseModel):
    vwap: Optional[float] = None
    ema20: Optional[float] = None
    ema50: Optional[float] = None
    rsi14: Optional[float] = None
    atr14: Optional[float] = None
    prev_20_high: Optional[float] = None
    volume_ratio: Optional[float] = None
    candle_body_ratio: Optional[float] = None
    spread_bps: Optional[float] = None
    stale_seconds: float = 0.0


class SymbolSnapshot(BaseModel):
    symbol: str
    asset_type: AssetType = AssetType.STOCK
    quote: Quote
    indicators: Indicators = Field(default_factory=Indicators)


class MarketSnapshot(BaseModel):
    """A single fair snapshot handed identically to every agent in one round."""

    id: str
    timestamp: datetime
    market_open: bool
    session: str = "closed"  # premarket | open | afterhours | closed
    regime: str = "uncertain"  # risk_on | risk_off | mixed | uncertain
    symbols: dict[str, SymbolSnapshot] = Field(default_factory=dict)


class Position(BaseModel):
    symbol: str
    asset_type: AssetType = AssetType.STOCK
    quantity: float = 0.0
    avg_price: float = 0.0
    current_price: float = 0.0
    side: OrderSide = OrderSide.LONG
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    trailing_stop: Optional[float] = None
    option_type: Optional[OptionType] = None
    multiplier: float = 1.0  # 100 for options

    @property
    def notional(self) -> float:
        return abs(self.quantity) * self.current_price * self.multiplier

    @property
    def unrealized_pnl(self) -> float:
        sign = 1 if self.side == OrderSide.LONG else -1
        return sign * (self.current_price - self.avg_price) * self.quantity * self.multiplier


class Order(BaseModel):
    id: str
    agent_id: str
    symbol: str
    asset_type: AssetType = AssetType.STOCK
    side: OrderSide = OrderSide.LONG
    order_type: OrderType = OrderType.MARKET
    quantity: float
    limit_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    trailing_stop: Optional[float] = None
    status: OrderStatus = OrderStatus.PENDING
    filled_quantity: float = 0.0
    avg_fill_price: Optional[float] = None
    multiplier: float = 1.0
    created_at: datetime
    updated_at: datetime
    decision_id: Optional[str] = None


class Fill(BaseModel):
    id: str
    order_id: str
    agent_id: str
    symbol: str
    quantity: float
    price: float
    commission: float = 0.0
    slippage: float = 0.0
    timestamp: datetime


class Trade(BaseModel):
    id: str
    agent_id: str
    symbol: str
    asset_type: AssetType = AssetType.STOCK
    side: OrderSide
    quantity: float
    entry_price: float
    exit_price: Optional[float] = None
    realized_pnl: float = 0.0
    opened_at: datetime
    closed_at: Optional[datetime] = None
    reason_closed: Optional[str] = None  # stop_loss | take_profit | trailing_stop | manual | time_exit


class Account(BaseModel):
    agent_id: str
    starting_cash: float = 10_000.0
    cash: float = 10_000.0
    realized_pnl: float = 0.0
    positions: dict[str, Position] = Field(default_factory=dict)
    high_water_mark: float = 10_000.0
    consecutive_losses: int = 0
    trades_today: int = 0
    daily_start_equity: float = 10_000.0
    weekly_start_equity: float = 10_000.0

    @property
    def unrealized_pnl(self) -> float:
        return sum(p.unrealized_pnl for p in self.positions.values())

    @property
    def equity(self) -> float:
        # Cash already reflects the premium/notional paid at entry; positions add back
        # their current market value so equity = cash + market value of holdings.
        return self.cash + self._positions_market_value()

    def _positions_market_value(self) -> float:
        return sum(
            p.quantity * p.current_price * p.multiplier for p in self.positions.values()
        )

    @property
    def buying_power(self) -> float:
        return max(0.0, self.cash)

    @property
    def option_exposure(self) -> float:
        return sum(
            p.notional for p in self.positions.values() if p.asset_type == AssetType.OPTION
        )

    @property
    def option_exposure_pct(self) -> float:
        eq = self.equity
        return (self.option_exposure / eq) if eq > 0 else 0.0

    @property
    def daily_pnl(self) -> float:
        return self.equity - self.daily_start_equity

    @property
    def current_drawdown_pct(self) -> float:
        if self.high_water_mark <= 0:
            return 0.0
        return max(0.0, (self.high_water_mark - self.equity) / self.high_water_mark)


class RiskEvent(BaseModel):
    id: str
    agent_id: str
    timestamp: datetime
    rule: str
    severity: str = "warning"  # warning | danger | info
    message: str
    symbol: Optional[str] = None
    decision_id: Optional[str] = None
