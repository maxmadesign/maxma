"""The Arena — in-memory simulation state + the decision-round orchestrator.

Fairness guarantees:
- One MarketSnapshot per round, handed identically to every enabled agent.
- Same risk rules, slippage, commissions, and option pricing for all.
- Agents do not see each other's current-round decisions.
- One provider failing never blocks the others; each is isolated in try/except.
- Every decision records the input_hash and the snapshot id.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from tradepilot.broker.paper import PaperBroker
from tradepilot.domain import (
    Account, MarketSnapshot, Order, RiskEvent, SymbolSnapshot,
)
from tradepilot.marketdata.synthetic import SyntheticMarketDataProvider
from tradepilot.prompt import PROMPT_VERSION, build_user_prompt, input_hash
from tradepilot.providers.base import LLMProvider
from tradepilot.providers.registry import ModelRegistry, build_provider
from tradepilot.risk.engine import GlobalRiskState, RiskEngine
from tradepilot.risk.settings import RISK_VERSION, RiskSettings
from tradepilot.schemas.decision import SymbolDecision, TradingDecision
from tradepilot.schemas.enums import (
    AgentStatus, AssetType, OrderSide, OrderType, OverallAction, Provider, SymbolAction,
)
from tradepilot.strategy import (
    DEFAULT_WATCHLIST, STRATEGY_VERSION, compute_indicators,
)

# Visual identity per provider (mirrored in apps/web/lib/semantic.ts).
PROVIDER_THEME = {
    Provider.OPENAI: {"name": "OpenAI Agent", "accent": "emerald"},
    Provider.ANTHROPIC: {"name": "Claude Agent", "accent": "amber"},
    Provider.GEMINI: {"name": "Gemini Agent", "accent": "blue"},
    Provider.DEEPSEEK: {"name": "DeepSeek Agent", "accent": "indigo"},
}


@dataclass
class AgentConfig:
    id: str
    provider: Provider
    name: str
    model: str
    fallback_model: str
    enabled: bool = True
    paused: bool = False
    status: AgentStatus = AgentStatus.IDLE
    accent: str = "slate"
    last_decision_at: Optional[datetime] = None
    last_action: Optional[str] = None


@dataclass
class DecisionRecord:
    id: str
    agent_id: str
    timestamp: datetime
    provider: str
    model: str
    valid: bool
    overall_action: str
    summary: str
    confidence: float
    decision: Optional[dict]
    error: Optional[str]
    repaired: bool
    input_hash: str
    snapshot_id: str
    cost_usd: float
    prompt_version: str = PROMPT_VERSION
    strategy_version: str = STRATEGY_VERSION
    risk_version: str = RISK_VERSION
    risk_results: list[dict] = field(default_factory=list)


@dataclass
class EquityPoint:
    agent_id: str
    timestamp: datetime
    equity: float
    drawdown_pct: float


class Arena:
    def __init__(self, *, market: Optional[SyntheticMarketDataProvider] = None,
                 provider_keys: Optional[dict[Provider, str]] = None) -> None:
        self.market = market or SyntheticMarketDataProvider()
        self.registry = ModelRegistry()
        self.risk_engine = RiskEngine(RiskSettings())
        self.broker = PaperBroker()
        self.global_state = GlobalRiskState(simulation_running=False, kill_switch_active=False)
        self.watchlist: list[str] = list(DEFAULT_WATCHLIST)
        self.provider_keys = provider_keys or {}

        self.agents: dict[str, AgentConfig] = {}
        self.accounts: dict[str, Account] = {}
        self.providers: dict[str, LLMProvider] = {}
        self.decisions: list[DecisionRecord] = []
        self.risk_events: list[RiskEvent] = []
        self.equity_curve: list[EquityPoint] = []
        self.cost_events: list[dict] = []
        self._seed_default_agents()

    # ------------------------------------------------------------------ setup
    def _seed_default_agents(self) -> None:
        for provider in (Provider.OPENAI, Provider.ANTHROPIC, Provider.GEMINI, Provider.DEEPSEEK):
            entry = self.registry.get(provider)
            theme = PROVIDER_THEME[provider]
            agent_id = provider.value
            self.agents[agent_id] = AgentConfig(
                id=agent_id, provider=provider, name=theme["name"],
                model=entry.default, fallback_model=entry.fallback, accent=theme["accent"],
            )
            self.accounts[agent_id] = Account(agent_id=agent_id)
            key = self.provider_keys.get(provider, "")
            self.providers[agent_id] = build_provider(provider, key, mock=not key)

    # ------------------------------------------------------------------ controls
    def start(self) -> None:
        self.global_state.simulation_running = True
        for a in self.agents.values():
            if a.enabled and not a.paused:
                a.status = AgentStatus.WAITING_FOR_MARKET

    def pause(self) -> None:
        self.global_state.simulation_running = False
        for a in self.agents.values():
            a.status = AgentStatus.IDLE

    def reset(self) -> None:
        self.broker = PaperBroker()
        self.decisions.clear()
        self.risk_events.clear()
        self.equity_curve.clear()
        self.cost_events.clear()
        for aid in self.accounts:
            self.accounts[aid] = Account(agent_id=aid)
            self.agents[aid].status = AgentStatus.IDLE
            self.agents[aid].last_action = None

    def reset_agent(self, agent_id: str) -> None:
        self.accounts[agent_id] = Account(agent_id=agent_id)
        self.agents[agent_id].status = AgentStatus.IDLE

    def kill_switch(self, close_positions: bool = True) -> None:
        self.global_state.kill_switch_active = True
        self.global_state.simulation_running = False
        prices = self._current_prices()
        for aid, account in self.accounts.items():
            self.broker.cancel_all(account)
            self.agents[aid].status = AgentStatus.PAUSED
            if close_positions:
                self.broker.flatten_all_simulated(account, prices)

    def clear_kill_switch(self) -> None:
        self.global_state.kill_switch_active = False
        for a in self.agents.values():
            if a.enabled and not a.paused:
                a.status = AgentStatus.IDLE

    # ------------------------------------------------------------------ snapshot
    def _current_prices(self) -> dict[str, float]:
        return {s: self.market.get_quote(s).price for s in self.watchlist}

    def build_snapshot(self, *, market_open: bool = True) -> MarketSnapshot:
        snap_id = str(uuid.uuid4())
        symbols: dict[str, SymbolSnapshot] = {}
        for s in self.watchlist:
            quote = self.market.get_quote(s)
            bars = self.market.get_bars(s, "5m", 60)
            indicators = compute_indicators(bars, spread_bps=quote.spread_bps,
                                            stale_seconds=quote.stale_seconds)
            atype = AssetType.ETF if s in ("SPY", "QQQ", "IWM") else AssetType.STOCK
            symbols[s] = SymbolSnapshot(symbol=s, asset_type=atype, quote=quote, indicators=indicators)
        return MarketSnapshot(
            id=snap_id, timestamp=datetime.now(timezone.utc),
            market_open=market_open, session="open" if market_open else "closed",
            regime="mixed", symbols=symbols,
        )

    def _build_context(self, agent: AgentConfig, snapshot: MarketSnapshot) -> dict:
        account = self.accounts[agent.id]
        return {
            "now": snapshot.timestamp.isoformat(),
            "market_open": snapshot.market_open,
            "regime": snapshot.regime,
            "snapshot_id": snapshot.id,
            "watchlist": self.watchlist,
            "prices": {s: ss.quote.price for s, ss in snapshot.symbols.items()},
            "indicators": {s: ss.indicators.model_dump() for s, ss in snapshot.symbols.items()},
            "account": self.broker.get_account_summary(account),
            "positions": [p.model_dump() for p in account.positions.values()],
            "risk_rules": self.risk_engine.settings.model_dump(),
            "option_exposure_pct": account.option_exposure_pct,
        }

    # ------------------------------------------------------------------ round
    def run_round(self, *, market_open: bool = True, agent_ids: Optional[list[str]] = None) -> dict:
        snapshot = self.build_snapshot(market_open=market_open)
        prices = {s: ss.quote.price for s, ss in snapshot.symbols.items()}

        # mark existing positions + trigger exits BEFORE new decisions
        for account in self.accounts.values():
            self.broker.mark_and_check_exits(account, prices)

        targets = agent_ids or [a.id for a in self.agents.values() if a.enabled and not a.paused]
        new_decisions = []
        for agent_id in targets:
            agent = self.agents[agent_id]
            agent.status = AgentStatus.THINKING
            try:
                rec = self._run_agent(agent, snapshot, prices)
                new_decisions.append(rec)
                agent.status = AgentStatus.TRADING if rec.overall_action == "trade" else AgentStatus.IDLE
                agent.last_decision_at = rec.timestamp
            except Exception as e:  # one provider must not break others
                agent.status = AgentStatus.ERROR
                self.decisions.append(DecisionRecord(
                    id=str(uuid.uuid4()), agent_id=agent_id, timestamp=datetime.now(timezone.utc),
                    provider=agent.provider.value, model=agent.model, valid=False,
                    overall_action="error", summary=f"Provider error: {e}", confidence=0,
                    decision=None, error=str(e), repaired=False, input_hash="",
                    snapshot_id=snapshot.id, cost_usd=0.0,
                ))

        # record equity points
        for account in self.accounts.values():
            self.equity_curve.append(EquityPoint(
                agent_id=account.agent_id, timestamp=snapshot.timestamp,
                equity=round(account.equity, 2), drawdown_pct=round(account.current_drawdown_pct, 4),
            ))
        # auto-pause on consecutive losses
        for account in self.accounts.values():
            if account.consecutive_losses >= self.risk_engine.settings.pause_after_consecutive_losses:
                self.agents[account.agent_id].paused = True
                self.agents[account.agent_id].status = AgentStatus.PAUSED
                self.risk_events.append(RiskEvent(
                    id=str(uuid.uuid4()), agent_id=account.agent_id,
                    timestamp=datetime.now(timezone.utc), rule="consecutive_losses",
                    severity="danger", message="连续亏损达到阈值，已暂停 Agent / paused after consecutive losses",
                ))

        return {"snapshot_id": snapshot.id, "decisions": len(new_decisions)}

    def _run_agent(self, agent: AgentConfig, snapshot: MarketSnapshot,
                   prices: dict[str, float]) -> DecisionRecord:
        context = self._build_context(agent, snapshot)
        prompt = build_user_prompt(context)
        ihash = input_hash(context)
        provider = self.providers[agent.id]
        model = self.registry.resolve_model(agent.provider, agent.model)

        result = provider.generate_structured_decision(
            prompt=prompt, agent_id=agent.id, model=model, context={**context, "regime": snapshot.regime},
        )
        self.cost_events.append({
            "agent_id": agent.id, "provider": agent.provider.value, "model": model,
            "timestamp": snapshot.timestamp.isoformat(), "cost_usd": result.cost_usd,
            "prompt_tokens": result.prompt_tokens, "completion_tokens": result.completion_tokens,
        })

        risk_results: list[dict] = []
        overall_action = "hold"
        summary = result.error or ""
        confidence = 0.0

        if result.valid and result.decision is not None:
            decision: TradingDecision = result.decision
            decision.input_hash = ihash
            decision.market_snapshot_id = snapshot.id
            decision.prompt_version = PROMPT_VERSION
            decision.strategy_version = STRATEGY_VERSION
            decision.risk_version = RISK_VERSION
            overall_action = decision.overall_action.value
            summary = decision.final_summary_for_user
            confidence = decision.confidence_score
            agent.last_action = overall_action

            account = self.accounts[agent.id]
            for sd in decision.decisions:
                rr = self._execute_symbol_decision(agent, account, sd, snapshot, prices)
                risk_results.append(rr)
        else:
            agent.last_action = "invalid"

        rec = DecisionRecord(
            id=str(uuid.uuid4()), agent_id=agent.id, timestamp=snapshot.timestamp,
            provider=agent.provider.value, model=model, valid=result.valid,
            overall_action=overall_action, summary=summary, confidence=confidence,
            decision=result.decision.model_dump() if result.decision else None,
            error=result.error, repaired=result.repaired, input_hash=ihash,
            snapshot_id=snapshot.id, cost_usd=result.cost_usd, risk_results=risk_results,
        )
        self.decisions.append(rec)
        return rec

    def _execute_symbol_decision(self, agent, account, sd: SymbolDecision,
                                 snapshot: MarketSnapshot, prices: dict[str, float]) -> dict:
        rd = self.risk_engine.evaluate(
            account=account, decision=sd, snapshot=snapshot,
            agent_paused=agent.paused, global_state=self.global_state, decision_id=None,
        )
        self.risk_events.extend(rd.events)
        result = {"symbol": sd.symbol, "action": sd.action.value, "approved": rd.approved,
                  "reason": rd.reason, "rule": rd.rule, "quantity": rd.approved_quantity}
        if not rd.approved or rd.approved_quantity <= 0:
            return result

        ref_price = prices.get(sd.symbol, sd.limit_price or 0.0)
        side = OrderSide.LONG if sd.action == SymbolAction.BUY else OrderSide.SHORT
        order = Order(
            id=str(uuid.uuid4()), agent_id=agent.id, symbol=sd.symbol,
            asset_type=sd.asset_type, side=side, order_type=sd.order_type,
            quantity=rd.approved_quantity, limit_price=sd.limit_price,
            stop_loss=sd.stop_loss, take_profit=sd.take_profit, trailing_stop=sd.trailing_stop,
            created_at=snapshot.timestamp, updated_at=snapshot.timestamp,
        )
        if sd.order_type == OrderType.BRACKET:
            fr = self.broker.place_bracket_order(account, order, ref_price)
        else:
            fr = self.broker.place_order(account, order, ref_price)
        result["order_status"] = fr.order.status.value
        result["fill_price"] = fr.fill.price if fr.fill else None
        return result

    # ------------------------------------------------------------------ views
    def leaderboard(self) -> list[dict]:
        from tradepilot.metrics import (
            agent_score, expectancy, profit_factor, win_rate,
        )
        rows = []
        for aid, account in self.accounts.items():
            agent = self.agents[aid]
            trades = [t for t in self.broker.trades if t.agent_id == aid]
            decisions = [d for d in self.decisions if d.agent_id == aid]
            invalid = sum(1 for d in decisions if not d.valid)
            violations = sum(1 for e in self.risk_events if e.agent_id == aid and e.severity == "danger")
            pf = profit_factor(trades)
            total_return = (account.equity - account.starting_cash) / account.starting_cash
            score = agent_score(
                total_return_pct=total_return, max_drawdown_pct=account.current_drawdown_pct,
                pf=pf, consistency_pct=win_rate(trades) * 100, risk_violations=violations,
                total_decisions=len(decisions), invalid_decisions=invalid,
            )
            rows.append({
                "agent_id": aid, "name": agent.name, "provider": agent.provider.value,
                "accent": agent.accent, "model": agent.model, "status": agent.status.value,
                "equity": round(account.equity, 2),
                "total_return_pct": round(total_return * 100, 2),
                "daily_pnl": round(account.daily_pnl, 2),
                "max_drawdown_pct": round(account.current_drawdown_pct * 100, 2),
                "win_rate": round(win_rate(trades) * 100, 1),
                "profit_factor": None if pf == float("inf") else round(pf, 2),
                "expectancy": round(expectancy(trades), 2),
                "total_trades": len([t for t in trades if t.closed_at]),
                "option_exposure_pct": round(account.option_exposure_pct * 100, 1),
                "risk_violations": violations,
                "open_positions": len(account.positions),
                "score": score.total,
            })
        rows.sort(key=lambda r: r["score"], reverse=True)
        for i, r in enumerate(rows, 1):
            r["rank"] = i
        return rows

    def total_cost(self) -> float:
        return sum(c["cost_usd"] for c in self.cost_events)
