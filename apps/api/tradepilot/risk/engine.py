"""Deterministic Risk Engine — independent of any LLM.

The Risk Engine is the *final* gate. LLMs propose orders; this engine approves or rejects
each one against deterministic rules and computes safe position sizes. Every rejection
produces a RiskEvent. The LLM can never bypass it.
"""
from __future__ import annotations

import math
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from tradepilot.domain import Account, MarketSnapshot, RiskEvent
from tradepilot.risk.settings import RISK_VERSION, RiskSettings
from tradepilot.schemas.decision import SymbolDecision
from tradepilot.schemas.enums import AssetType, OrderSide, SymbolAction


def position_size(
    equity: float, entry_price: float, stop_loss: float, settings: RiskSettings
) -> int:
    """Shares = min(risk-based, notional-based). Returns 0 if inputs invalid."""
    if entry_price <= 0 or stop_loss <= 0 or equity <= 0:
        return 0
    risk_per_share = abs(entry_price - stop_loss)
    if risk_per_share <= 0:
        return 0
    risk_dollars = equity * settings.risk_per_trade_pct
    shares_by_risk = math.floor(risk_dollars / risk_per_share)
    shares_by_notional = math.floor(
        (equity * settings.max_position_notional_pct) / entry_price
    )
    return max(0, min(shares_by_risk, shares_by_notional))


def option_premium_risk(mid_price: float, contracts: int) -> float:
    """premium_risk = mid * 100 * contracts."""
    return max(0.0, mid_price) * 100.0 * max(0, contracts)


@dataclass
class RiskDecision:
    approved: bool
    reason: str = ""
    rule: str = ""
    severity: str = "warning"
    approved_quantity: float = 0.0
    events: list[RiskEvent] = field(default_factory=list)


@dataclass
class GlobalRiskState:
    simulation_running: bool = True
    kill_switch_active: bool = False


def _event(agent_id: str, rule: str, message: str, *, severity: str = "warning",
           symbol: Optional[str] = None, decision_id: Optional[str] = None) -> RiskEvent:
    return RiskEvent(
        id=str(uuid.uuid4()),
        agent_id=agent_id,
        timestamp=datetime.now(timezone.utc),
        rule=rule,
        severity=severity,
        message=message,
        symbol=symbol,
        decision_id=decision_id,
    )


class RiskEngine:
    version = RISK_VERSION

    def __init__(self, settings: Optional[RiskSettings] = None) -> None:
        self.settings = settings or RiskSettings()

    def evaluate(
        self,
        *,
        account: Account,
        decision: SymbolDecision,
        snapshot: MarketSnapshot,
        agent_paused: bool,
        global_state: GlobalRiskState,
        decision_id: Optional[str] = None,
    ) -> RiskDecision:
        """Evaluate a single proposed symbol order. Closing/reducing existing positions is
        always allowed (even when the market is closed), to let agents de-risk."""
        s = self.settings
        agent_id = account.agent_id
        symbol = decision.symbol
        is_closing = decision.action in (SymbolAction.SELL, SymbolAction.CLOSE, SymbolAction.REDUCE)

        def reject(rule: str, msg: str, severity: str = "warning") -> RiskDecision:
            ev = _event(agent_id, rule, msg, severity=severity, symbol=symbol, decision_id=decision_id)
            return RiskDecision(approved=False, reason=msg, rule=rule, severity=severity, events=[ev])

        # 1-3: global gates
        if not global_state.simulation_running:
            return reject("simulation_not_running", "模拟盘未运行，拒绝下单 / Simulation not running")
        if agent_paused:
            return reject("agent_paused", "Agent 已暂停，拒绝下单 / Agent is paused")
        if global_state.kill_switch_active:
            return reject("kill_switch", "全局紧急停止已激活 / Global kill switch active", "danger")

        # HOLD / WATCH never reach the broker — approve as no-op.
        if decision.action == SymbolAction.HOLD:
            return RiskDecision(approved=False, reason="HOLD — no order", rule="hold")

        # 16: quantity
        if decision.quantity <= 0:
            return reject("invalid_quantity", "数量必须大于 0 / quantity must be > 0")

        # 14: no naked short options
        if decision.asset_type == AssetType.OPTION and s.no_naked_short_options:
            if decision.side == OrderSide.SHORT or decision.action == SymbolAction.SELL:
                if symbol not in account.positions:
                    return reject(
                        "no_naked_short_options",
                        "禁止裸卖期权 / Naked short options are not allowed", "danger",
                    )

        # 4: market closed — only allow closing
        if not snapshot.market_open and not is_closing:
            return reject("market_closed", "市场休市，仅允许平仓 / Market closed; only closing allowed")

        sym_snap = snapshot.symbols.get(symbol)

        # 5 & 6: stale data / wide spread (skip these checks for closing actions)
        if not is_closing:
            if sym_snap is None:
                return reject("no_market_data", f"缺少 {symbol} 行情 / no market data for {symbol}")
            if sym_snap.quote.stale_seconds > s.max_stale_seconds:
                return reject("stale_data", f"行情过期 {sym_snap.quote.stale_seconds:.0f}s / stale market data")
            if sym_snap.quote.spread_bps > s.max_spread_bps:
                return reject("wide_spread", f"点差过宽 {sym_snap.quote.spread_bps:.1f}bps / spread too wide")

        # 7: max trades per day
        if not is_closing and account.trades_today >= s.max_trades_per_day:
            return reject("max_trades_per_day", "已达每日最大交易次数 / max trades per day reached")

        # 8 & 9: daily / weekly loss limits
        eq = account.equity
        daily_loss = account.daily_start_equity - eq
        if daily_loss >= s.starting_equity * s.max_daily_loss_pct and not is_closing:
            return reject("max_daily_loss", "已触发每日亏损上限 / daily loss limit hit", "danger")
        weekly_loss = account.weekly_start_equity - eq
        if weekly_loss >= s.starting_equity * s.max_weekly_loss_pct and not is_closing:
            return reject("max_weekly_loss", "已触发每周亏损上限 / weekly loss limit hit", "danger")

        # 10: max open positions (only for opening new symbols)
        opening_new = not is_closing and symbol not in account.positions
        if opening_new and len(account.positions) >= s.max_open_positions:
            return reject("max_open_positions", "已达最大持仓数量 / max open positions reached")

        # 15: invalid stop/take (for opening long equity/etf)
        if not is_closing and decision.asset_type in (AssetType.STOCK, AssetType.ETF):
            entry = decision.limit_price or (sym_snap.quote.price if sym_snap else 0.0)
            if decision.stop_loss is not None and decision.stop_loss <= 0:
                return reject("invalid_stop", "无效止损 / invalid stop loss")
            if decision.side == OrderSide.LONG and decision.stop_loss and decision.stop_loss >= entry:
                return reject("invalid_stop", "多头止损必须低于入场价 / long stop must be below entry")
            if decision.take_profit is not None and decision.take_profit <= 0:
                return reject("invalid_take_profit", "无效止盈 / invalid take profit")

        # ----- sizing & exposure -----
        if is_closing:
            held = account.positions.get(symbol)
            qty = min(decision.quantity, abs(held.quantity)) if held else decision.quantity
            return RiskDecision(approved=True, reason="closing/reducing approved",
                                rule="ok", approved_quantity=qty)

        if decision.asset_type == AssetType.OPTION:
            return self._size_option(account, decision, reject)

        # equity / etf sizing
        entry = decision.limit_price or (sym_snap.quote.price if sym_snap else 0.0)
        stop = decision.stop_loss or 0.0
        shares = position_size(eq, entry, stop, s)
        if shares <= 0:
            return reject("zero_position_size", "按风险计算仓位为 0 / computed position size is 0")
        # 11: notional cap (double-check)
        if shares * entry > eq * s.max_position_notional_pct + 1e-6:
            shares = math.floor((eq * s.max_position_notional_pct) / entry)
        if shares <= 0:
            return reject("notional_cap", "超过单仓名义金额上限 / exceeds max position notional")
        return RiskDecision(approved=True, reason="approved", rule="ok", approved_quantity=float(shares))

    def _size_option(self, account: Account, decision: SymbolDecision, reject) -> RiskDecision:
        s = self.settings
        oc = decision.option_contract
        if oc is None or oc.mid is None or oc.mid <= 0:
            # 期权数据不可用
            return reject("option_data_unavailable",
                          "期权数据不可用，跳过期权交易 / option data unavailable")
        eq = account.equity
        contracts = int(decision.quantity)
        if contracts <= 0:
            return reject("invalid_quantity", "期权合约数必须大于 0 / contracts must be > 0")
        premium_risk = option_premium_risk(oc.mid, contracts)
        single_limit = eq * s.max_single_option_trade_risk_pct
        total_limit = eq * s.max_option_exposure_pct
        if premium_risk > single_limit + 1e-6:
            return reject("single_option_risk",
                          f"单笔期权风险 ${premium_risk:.0f} 超过 5% 限额 ${single_limit:.0f}", "danger")
        if account.option_exposure + premium_risk > total_limit + 1e-6:
            return reject("option_exposure_limit",
                          f"期权总敞口将超过 30% 限额 / total option exposure would exceed 30%", "danger")
        return RiskDecision(approved=True, reason="option approved", rule="ok",
                            approved_quantity=float(contracts))
