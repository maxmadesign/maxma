"""Shared enums for the domain. Kept in one place so the frontend semantic token
system and the backend stay in sync (see apps/web/lib/semantic.ts)."""
from __future__ import annotations

from enum import Enum


class Provider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"
    DEEPSEEK = "deepseek"


class MarketRegime(str, Enum):
    RISK_ON = "risk_on"
    RISK_OFF = "risk_off"
    MIXED = "mixed"
    UNCERTAIN = "uncertain"


class OverallAction(str, Enum):
    TRADE = "trade"
    HOLD = "hold"
    REDUCE_RISK = "reduce_risk"
    CLOSE_POSITIONS = "close_positions"


class SymbolAction(str, Enum):
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"
    REDUCE = "reduce"
    CLOSE = "close"


class TradeAction(str, Enum):
    """UI action tags (superset used for tagging/labelling)."""

    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"
    WATCH = "watch"
    REDUCE = "reduce"
    CLOSE = "close"


class OrderSide(str, Enum):
    LONG = "long"
    SHORT = "short"
    NONE = "none"


class OrderType(str, Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    BRACKET = "bracket"


class OrderStatus(str, Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    PARTIALLY_FILLED = "partially_filled"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    EXPIRED = "expired"


class AssetType(str, Enum):
    STOCK = "stock"
    ETF = "etf"
    OPTION = "option"
    CASH = "cash"


class OptionType(str, Enum):
    CALL = "call"
    PUT = "put"


class RiskStatus(str, Enum):
    SAFE = "safe"
    WARNING = "warning"
    DANGER = "danger"
    PAUSED = "paused"
    KILL_SWITCH = "kill_switch"


class AgentStatus(str, Enum):
    THINKING = "thinking"
    IDLE = "idle"
    WAITING_FOR_MARKET = "waiting_for_market"
    TRADING = "trading"
    PAUSED = "paused"
    ERROR = "error"
    DISABLED = "disabled"
