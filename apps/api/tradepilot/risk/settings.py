"""Risk parameters. These are the per-agent defaults from the spec."""
from __future__ import annotations

from pydantic import BaseModel

RISK_VERSION = "risk-v1"


class RiskSettings(BaseModel):
    starting_equity: float = 10_000.0
    risk_per_trade_pct: float = 0.005
    max_daily_loss_pct: float = 0.015
    max_weekly_loss_pct: float = 0.04
    max_position_notional_pct: float = 0.25
    max_open_positions: int = 3
    max_trades_per_day: int = 8
    pause_after_consecutive_losses: int = 2
    max_option_exposure_pct: float = 0.30
    max_single_option_trade_risk_pct: float = 0.05
    no_naked_short_options: bool = True
    no_averaging_down: bool = True
    live_trading_enabled: bool = False

    # Microstructure guards
    max_spread_bps: float = 8.0
    max_stale_seconds: float = 10.0
