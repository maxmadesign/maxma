"""Unified LLMProvider interface + a deterministic mock used when no real key is set.

Every provider supports mock mode so the full app runs in Demo with no API keys.
Real providers issue structured-output requests via the provider's best mechanism
(OpenAI structured outputs / Gemini JSON schema / Claude tool use / DeepSeek JSON mode)
— wired in subclasses; the base provides the mock + schema validation/repair flow.
"""
from __future__ import annotations

import hashlib
import json
import random
from abc import ABC
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from pydantic import ValidationError

from tradepilot.schemas.decision import TradingDecision
from tradepilot.schemas.enums import Provider


@dataclass
class ProviderHealth:
    provider: str
    status: str  # connected | missing_key | invalid_key | rate_limited | degraded | disabled
    detail: str = ""
    checked_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class GenerationResult:
    raw_text: str
    decision: Optional[TradingDecision] = None
    valid: bool = False
    error: Optional[str] = None
    repaired: bool = False
    model: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    cost_usd: float = 0.0


# Rough public per-1K-token prices (USD) for cost estimation only. Not hardcoded into logic.
PRICE_TABLE = {
    Provider.OPENAI: (0.0025, 0.010),
    Provider.ANTHROPIC: (0.003, 0.015),
    Provider.GEMINI: (0.00125, 0.005),
    Provider.DEEPSEEK: (0.00027, 0.0011),
}


class LLMProvider(ABC):
    provider_id: Provider

    def __init__(self, api_key: str = "", *, mock: bool = True) -> None:
        self.api_key = api_key or ""
        # Mock if explicitly requested OR no key available.
        self.mock = mock or not self.api_key
        self.display_name = self.provider_id.value

    # ---- capabilities (overridden by real subclasses) ----
    def list_models(self) -> list[str]:
        from tradepilot.providers.registry import DEFAULT_MODELS
        return list(DEFAULT_MODELS[self.provider_id]["models"])

    def validate_key(self) -> ProviderHealth:
        if self.mock:
            return ProviderHealth(self.provider_id.value, "disabled",
                                  "Mock mode (no key). Demo decisions are synthetic.")
        return ProviderHealth(self.provider_id.value, "connected", "Key present (mock validation).")

    def health_check(self) -> ProviderHealth:
        return self.validate_key()

    def estimate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        pin, pout = PRICE_TABLE.get(self.provider_id, (0.001, 0.002))
        return (prompt_tokens / 1000.0) * pin + (completion_tokens / 1000.0) * pout

    # ---- decision generation ----
    def generate_structured_decision(
        self, *, prompt: str, agent_id: str, model: str, context: dict
    ) -> GenerationResult:
        """Returns a validated TradingDecision or a clearly-flagged failure.

        Real subclasses override ``_raw_generate``. The base handles the mock path,
        JSON validation, and a single repair retry.
        """
        prompt_tokens = max(1, len(prompt) // 4)
        if self.mock:
            text = self._mock_decision_json(agent_id, model, context)
        else:
            text = self._raw_generate(prompt=prompt, model=model, context=context)

        completion_tokens = max(1, len(text) // 4)
        cost = self.estimate_cost(prompt_tokens, completion_tokens)

        decision, err = self._parse(text, agent_id, model)
        if decision is None and not self.mock:
            # one repair retry
            repaired_text = self._raw_generate(
                prompt=prompt + "\n\nYour previous output was invalid JSON for the schema. "
                "Return ONLY valid JSON matching the TradingDecision schema.",
                model=model, context=context,
            )
            decision, err = self._parse(repaired_text, agent_id, model)
            return GenerationResult(
                raw_text=repaired_text, decision=decision, valid=decision is not None,
                error=err, repaired=True, model=model,
                prompt_tokens=prompt_tokens, completion_tokens=completion_tokens, cost_usd=cost,
            )

        return GenerationResult(
            raw_text=text, decision=decision, valid=decision is not None, error=err,
            model=model, prompt_tokens=prompt_tokens, completion_tokens=completion_tokens, cost_usd=cost,
        )

    # ---- internals ----
    def _raw_generate(self, *, prompt: str, model: str, context: dict) -> str:  # pragma: no cover
        raise NotImplementedError("Real provider call not implemented in this build; use mock mode.")

    @staticmethod
    def _parse(text: str, agent_id: str, model: str) -> tuple[Optional[TradingDecision], Optional[str]]:
        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            return None, f"INVALID_RESPONSE: not JSON ({e})"
        try:
            data.setdefault("agent_id", agent_id)
            data.setdefault("model", model)
            decision = TradingDecision.model_validate(data)
            return decision, None
        except ValidationError as e:
            return None, f"INVALID_RESPONSE: schema mismatch ({e.error_count()} errors)"

    def _mock_decision_json(self, agent_id: str, model: str, context: dict) -> str:
        """Deterministic-ish synthetic decision driven by the strategy checklist, so demo
        dashboards look realistic. Seeded by agent + snapshot so agents differ but are stable."""
        snap_id = context.get("snapshot_id", "snap")
        seed = int(hashlib.sha256(f"{agent_id}-{snap_id}".encode()).hexdigest(), 16) % (2**32)
        rng = random.Random(seed)
        symbols = context.get("watchlist", ["SPY", "QQQ", "AAPL", "NVDA"])
        regime = context.get("regime", "mixed")

        roll = rng.random()
        market_open = context.get("market_open", True)
        if not market_open or roll < 0.45:
            return json.dumps({
                "agent_id": agent_id, "provider": self.provider_id.value, "model": model,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "market_regime": regime, "overall_action": "hold", "decisions": [],
                "portfolio_notes": "数据不足或市场状态不明，选择观望以保护本金。",
                "confidence_score": round(40 + rng.random() * 20, 1),
                "final_summary_for_user": "本轮没有满足条件的高质量信号，保持观望。HOLD 也是好决策。",
            })

        sym = rng.choice(symbols)
        price = float(context.get("prices", {}).get(sym, 100 + rng.random() * 300))
        stop = round(price * (1 - 0.01 - rng.random() * 0.01), 2)
        tp = round(price * (1 + 0.02 + rng.random() * 0.02), 2)
        conf = round(55 + rng.random() * 35, 1)
        checklist = [
            {"label": "SPY > VWAP", "passed": rng.random() > 0.3, "value": None,
             "explanation": "大盘处于 VWAP 上方，偏多。"},
            {"label": f"{sym} EMA20 > EMA50", "passed": rng.random() > 0.3, "value": None,
             "explanation": "短期均线在长期均线上方，趋势向上。"},
            {"label": "RSI14 在 50-72", "passed": rng.random() > 0.3, "value": round(50 + rng.random()*22, 1),
             "explanation": "动量健康但未过热。"},
            {"label": "成交量 > 1.5x 均量", "passed": rng.random() > 0.4, "value": None,
             "explanation": "放量突破，参与度高。"},
        ]
        return json.dumps({
            "agent_id": agent_id, "provider": self.provider_id.value, "model": model,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "market_regime": regime, "overall_action": "trade",
            "decisions": [{
                "symbol": sym, "asset_type": "stock", "action": "buy", "side": "long",
                "order_type": "bracket", "quantity": 1, "limit_price": None,
                "stop_loss": stop, "take_profit": tp, "trailing_stop": None,
                "expected_holding_period": "intraday",
                "thesis_summary": f"{sym} 放量站上 VWAP 且短均线上穿，符合动量突破框架。",
                "evidence": [f"{sym} 收盘价高于 VWAP", "20 根 K 线新高", "成交量放大"],
                "signal_checklist": checklist,
                "risk_assessment": "单笔风险控制在账户权益 0.5% 以内，设置了止损。",
                "position_sizing_reason": "按固定风险百分比计算仓位。",
                "stop_loss_reason": "止损设在近期结构低点下方。",
                "take_profit_reason": "止盈按约 2R 设置。",
                "invalidation_condition": "若收盘跌破 VWAP 则判断失效。",
                "uncertainty_notes": "突破可能假突破，需观察量能持续性。",
                "confidence_score": conf, "reason_tags": ["vwap_breakout", "momentum"],
            }],
            "portfolio_notes": "保持单一新仓，控制总敞口。",
            "confidence_score": conf,
            "final_summary_for_user": f"买入 {sym}：放量突破且趋势向上，已设好止损止盈，风险可控。",
        })
