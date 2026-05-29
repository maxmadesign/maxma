"""SQLAlchemy models mirroring the runtime domain. Tables match the spec list:

users, provider_keys, model_registry, model_change_logs, agents, agent_settings, portfolios,
positions, orders, fills, trades, decisions, decision_inputs, decision_outputs, risk_events,
market_snapshots, equity_snapshots, backtests, audit_events, settings, cost_events, reports,
watchlists.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class User(Base, TimestampMixin):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, default="admin")
    password_hash: Mapped[str] = mapped_column(String(255))


class ProviderKey(Base, TimestampMixin):
    __tablename__ = "provider_keys"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider: Mapped[str] = mapped_column(String(32), unique=True)
    encrypted_key: Mapped[str] = mapped_column(Text)  # ciphertext only — never plaintext
    status: Mapped[str] = mapped_column(String(32), default="connected")


class ModelRegistryRow(Base, TimestampMixin):
    __tablename__ = "model_registry"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider: Mapped[str] = mapped_column(String(32))
    models: Mapped[dict] = mapped_column(JSON)
    default_model: Mapped[str] = mapped_column(String(128))
    fallback_model: Mapped[str] = mapped_column(String(128))
    refreshed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ModelChangeLog(Base, TimestampMixin):
    __tablename__ = "model_change_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    agent_id: Mapped[str] = mapped_column(String(64))
    old_model: Mapped[str] = mapped_column(String(128))
    new_model: Mapped[str] = mapped_column(String(128))


class Agent(Base, TimestampMixin):
    __tablename__ = "agents"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    provider: Mapped[str] = mapped_column(String(32))
    name: Mapped[str] = mapped_column(String(128))
    model: Mapped[str] = mapped_column(String(128))
    fallback_model: Mapped[str] = mapped_column(String(128))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    paused: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(32), default="idle")


class AgentSettings(Base):
    __tablename__ = "agent_settings"
    agent_id: Mapped[str] = mapped_column(String(64), ForeignKey("agents.id"), primary_key=True)
    risk_settings: Mapped[dict] = mapped_column(JSON)
    prompt_version: Mapped[str] = mapped_column(String(64))


class Portfolio(Base):
    __tablename__ = "portfolios"
    agent_id: Mapped[str] = mapped_column(String(64), ForeignKey("agents.id"), primary_key=True)
    cash: Mapped[float] = mapped_column(Float, default=10_000.0)
    realized_pnl: Mapped[float] = mapped_column(Float, default=0.0)
    high_water_mark: Mapped[float] = mapped_column(Float, default=10_000.0)


class Position(Base):
    __tablename__ = "positions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    agent_id: Mapped[str] = mapped_column(String(64), ForeignKey("agents.id"))
    symbol: Mapped[str] = mapped_column(String(16))
    asset_type: Mapped[str] = mapped_column(String(16))
    quantity: Mapped[float] = mapped_column(Float)
    avg_price: Mapped[float] = mapped_column(Float)
    stop_loss: Mapped[float | None] = mapped_column(Float, nullable=True)
    take_profit: Mapped[float | None] = mapped_column(Float, nullable=True)


class Order(Base, TimestampMixin):
    __tablename__ = "orders"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    agent_id: Mapped[str] = mapped_column(String(64), ForeignKey("agents.id"))
    symbol: Mapped[str] = mapped_column(String(16))
    side: Mapped[str] = mapped_column(String(8))
    order_type: Mapped[str] = mapped_column(String(16))
    quantity: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(24))
    decision_id: Mapped[str | None] = mapped_column(String(64), nullable=True)


class Fill(Base, TimestampMixin):
    __tablename__ = "fills"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    order_id: Mapped[str] = mapped_column(String(64))
    agent_id: Mapped[str] = mapped_column(String(64))
    symbol: Mapped[str] = mapped_column(String(16))
    quantity: Mapped[float] = mapped_column(Float)
    price: Mapped[float] = mapped_column(Float)
    commission: Mapped[float] = mapped_column(Float, default=0.0)


class Trade(Base, TimestampMixin):
    __tablename__ = "trades"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    agent_id: Mapped[str] = mapped_column(String(64))
    symbol: Mapped[str] = mapped_column(String(16))
    side: Mapped[str] = mapped_column(String(8))
    quantity: Mapped[float] = mapped_column(Float)
    entry_price: Mapped[float] = mapped_column(Float)
    exit_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    realized_pnl: Mapped[float] = mapped_column(Float, default=0.0)
    reason_closed: Mapped[str | None] = mapped_column(String(32), nullable=True)


class Decision(Base, TimestampMixin):
    __tablename__ = "decisions"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    agent_id: Mapped[str] = mapped_column(String(64))
    provider: Mapped[str] = mapped_column(String(32))
    model: Mapped[str] = mapped_column(String(128))
    valid: Mapped[bool] = mapped_column(Boolean)
    overall_action: Mapped[str] = mapped_column(String(24))
    summary: Mapped[str] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(Float)
    input_hash: Mapped[str] = mapped_column(String(32))
    snapshot_id: Mapped[str] = mapped_column(String(64))
    prompt_version: Mapped[str] = mapped_column(String(64))
    strategy_version: Mapped[str] = mapped_column(String(64))
    risk_version: Mapped[str] = mapped_column(String(64))
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)


class DecisionInput(Base):
    __tablename__ = "decision_inputs"
    decision_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    payload: Mapped[dict] = mapped_column(JSON)


class DecisionOutput(Base):
    __tablename__ = "decision_outputs"
    decision_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    payload: Mapped[dict] = mapped_column(JSON)
    raw_text: Mapped[str] = mapped_column(Text)


class RiskEvent(Base, TimestampMixin):
    __tablename__ = "risk_events"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    agent_id: Mapped[str] = mapped_column(String(64))
    rule: Mapped[str] = mapped_column(String(64))
    severity: Mapped[str] = mapped_column(String(16))
    message: Mapped[str] = mapped_column(Text)
    symbol: Mapped[str | None] = mapped_column(String(16), nullable=True)


class MarketSnapshotRow(Base, TimestampMixin):
    __tablename__ = "market_snapshots"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    market_open: Mapped[bool] = mapped_column(Boolean)
    regime: Mapped[str] = mapped_column(String(16))
    payload: Mapped[dict] = mapped_column(JSON)


class EquitySnapshot(Base, TimestampMixin):
    __tablename__ = "equity_snapshots"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    agent_id: Mapped[str] = mapped_column(String(64))
    equity: Mapped[float] = mapped_column(Float)
    drawdown_pct: Mapped[float] = mapped_column(Float)


class Backtest(Base, TimestampMixin):
    __tablename__ = "backtests"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    strategy: Mapped[str] = mapped_column(String(64))
    params: Mapped[dict] = mapped_column(JSON)
    result: Mapped[dict] = mapped_column(JSON)


class AuditEvent(Base, TimestampMixin):
    __tablename__ = "audit_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event: Mapped[str] = mapped_column(String(64))
    detail: Mapped[dict] = mapped_column(JSON)


class Setting(Base):
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON)


class CostEvent(Base, TimestampMixin):
    __tablename__ = "cost_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    agent_id: Mapped[str] = mapped_column(String(64))
    provider: Mapped[str] = mapped_column(String(32))
    model: Mapped[str] = mapped_column(String(128))
    cost_usd: Mapped[float] = mapped_column(Float)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)


class Report(Base, TimestampMixin):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    language: Mapped[str] = mapped_column(String(8))
    payload: Mapped[dict] = mapped_column(JSON)


class Watchlist(Base):
    __tablename__ = "watchlists"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbols: Mapped[dict] = mapped_column(JSON)
