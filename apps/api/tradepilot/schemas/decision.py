"""The strict, version-able trading decision protocol.

Every LLM trading decision MUST validate against ``TradingDecision``. Models output
*user-readable* structured explanations — never hidden chain-of-thought.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Optional, Union

from pydantic import BaseModel, Field, field_validator

from tradepilot.schemas.enums import (
    AssetType,
    MarketRegime,
    OptionType,
    OrderSide,
    OrderType,
    OverallAction,
    Provider,
    SymbolAction,
)


class ChecklistItem(BaseModel):
    label: str
    passed: bool
    value: Optional[Union[str, float]] = None
    explanation: str = ""


class OptionContract(BaseModel):
    underlying: str
    type: OptionType
    strike: float = Field(gt=0)
    expiration: date
    dte: int = Field(ge=0, description="Days to expiration")
    premium: Optional[float] = Field(default=None, ge=0)
    bid: Optional[float] = Field(default=None, ge=0)
    ask: Optional[float] = Field(default=None, ge=0)
    mid: Optional[float] = Field(default=None, ge=0)
    implied_volatility: Optional[float] = Field(default=None, ge=0)


class SymbolDecision(BaseModel):
    symbol: str
    asset_type: AssetType
    action: SymbolAction
    side: OrderSide = OrderSide.NONE
    order_type: OrderType = OrderType.MARKET
    quantity: float = Field(ge=0)
    limit_price: Optional[float] = Field(default=None, ge=0)
    stop_loss: Optional[float] = Field(default=None, ge=0)
    take_profit: Optional[float] = Field(default=None, ge=0)
    trailing_stop: Optional[float] = Field(default=None, ge=0)
    option_contract: Optional[OptionContract] = None
    expected_holding_period: str = ""
    thesis_summary: str = ""
    evidence: list[str] = Field(default_factory=list)
    signal_checklist: list[ChecklistItem] = Field(default_factory=list)
    risk_assessment: str = ""
    position_sizing_reason: str = ""
    stop_loss_reason: str = ""
    take_profit_reason: str = ""
    invalidation_condition: str = ""
    uncertainty_notes: str = ""
    confidence_score: float = Field(ge=0, le=100, default=50)
    reason_tags: list[str] = Field(default_factory=list)

    @field_validator("symbol")
    @classmethod
    def _upper(cls, v: str) -> str:
        return v.strip().upper()


class TradingDecision(BaseModel):
    agent_id: str
    provider: Provider
    model: str
    timestamp: datetime
    market_regime: MarketRegime
    overall_action: OverallAction
    decisions: list[SymbolDecision] = Field(default_factory=list)
    portfolio_notes: str = ""
    confidence_score: float = Field(ge=0, le=100, default=50)
    final_summary_for_user: str = ""

    # Provenance (filled by the runner, not the model)
    prompt_version: Optional[str] = None
    strategy_version: Optional[str] = None
    risk_version: Optional[str] = None
    input_hash: Optional[str] = None
    market_snapshot_id: Optional[str] = None
