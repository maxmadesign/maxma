"""Structured decision validation + provider mock behaviour."""
import json

from tradepilot.providers.base import LLMProvider
from tradepilot.providers.registry import build_provider
from tradepilot.schemas.decision import TradingDecision
from tradepilot.schemas.enums import Provider


def test_valid_decision_parses():
    dec, err = LLMProvider._parse(json.dumps({
        "agent_id": "openai", "provider": "openai", "model": "gpt-5.1",
        "timestamp": "2026-05-29T12:00:00Z", "market_regime": "mixed",
        "overall_action": "hold", "decisions": [], "confidence_score": 50,
        "final_summary_for_user": "观望",
    }), "openai", "gpt-5.1")
    assert err is None and isinstance(dec, TradingDecision)


def test_invalid_json_rejected():
    dec, err = LLMProvider._parse("not json{", "openai", "m")
    assert dec is None and err and err.startswith("INVALID_RESPONSE")


def test_schema_mismatch_rejected():
    dec, err = LLMProvider._parse(json.dumps({"agent_id": "x"}), "x", "m")
    assert dec is None and "INVALID_RESPONSE" in err


def test_mock_provider_produces_valid_decision():
    p = build_provider(Provider.OPENAI, "", mock=True)
    result = p.generate_structured_decision(
        prompt="x", agent_id="openai", model="gpt-5.1",
        context={"snapshot_id": "s1", "watchlist": ["AAPL"], "regime": "mixed",
                 "market_open": True, "prices": {"AAPL": 200.0}},
    )
    assert result.valid and result.decision is not None
    assert result.cost_usd >= 0


def test_all_providers_have_mock_mode():
    for p in Provider:
        prov = build_provider(p, "", mock=True)
        assert prov.mock is True
