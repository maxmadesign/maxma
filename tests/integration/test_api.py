"""API smoke tests (demo mode). Skipped if FastAPI isn't installed."""
import pytest

pytest.importorskip("fastapi")

from fastapi.testclient import TestClient  # noqa: E402

from tradepilot.main import app  # noqa: E402

client = TestClient(app)


def test_health_is_paper_and_live_disabled():
    r = client.get("/health").json()
    assert r["mode"] == "paper"
    assert r["live_trading_enabled"] is False


def test_leaderboard_has_four_agents():
    rows = client.get("/simulation/leaderboard").json()
    assert len(rows) == 4
    assert rows[0]["rank"] == 1


def test_providers_listed_with_masked_only():
    provs = client.get("/providers").json()
    ids = {p["provider"] for p in provs}
    assert ids == {"openai", "anthropic", "gemini", "deepseek"}
    for p in provs:
        # no plaintext key ever returned
        assert "api_key" not in p


def test_clear_kill_switch_requires_typed_confirmation():
    client.post("/risk/kill-switch")
    bad = client.post("/risk/clear-kill-switch", json={"confirmation": "nope"})
    assert bad.status_code == 400
    ok = client.post("/risk/clear-kill-switch", json={"confirmation": "CLEAR"})
    assert ok.status_code == 200


def test_decisions_endpoint_returns_records():
    decs = client.get("/decisions?limit=10").json()
    assert isinstance(decs, list)


def test_market_options_reports_availability():
    r = client.get("/market/options/AAPL").json()
    assert "available" in r
