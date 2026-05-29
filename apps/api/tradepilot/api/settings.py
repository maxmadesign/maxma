from __future__ import annotations

from fastapi import APIRouter

from tradepilot.config import get_settings
from tradepilot.state import get_arena

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
def read_settings() -> dict:
    s = get_settings()
    a = get_arena()
    return {
        "live_trading_enabled": s.live_trading_enabled,
        "paper_trading": s.paper_trading,
        "demo_mode": s.demo_mode,
        "default_language": s.default_language,
        "default_theme": s.default_theme,
        "monthly_ai_budget_usd": s.monthly_ai_budget_usd,
        "decision_interval_seconds": s.decision_interval_seconds,
        "watchlist": a.watchlist,
    }


@router.get("/i18n")
def i18n_settings() -> dict:
    s = get_settings()
    return {"default_language": s.default_language, "supported": ["zh-CN", "en-US"]}


@router.get("/cost")
def cost_dashboard() -> dict:
    a = get_arena()
    s = get_settings()
    by_provider: dict[str, float] = {}
    by_agent: dict[str, float] = {}
    for c in a.cost_events:
        by_provider[c["provider"]] = by_provider.get(c["provider"], 0.0) + c["cost_usd"]
        by_agent[c["agent_id"]] = by_agent.get(c["agent_id"], 0.0) + c["cost_usd"]
    total = a.total_cost()
    return {
        "total_cost_usd": round(total, 4),
        "by_provider": {k: round(v, 4) for k, v in by_provider.items()},
        "by_agent": {k: round(v, 4) for k, v in by_agent.items()},
        "monthly_budget_usd": s.monthly_ai_budget_usd,
        "budget_used_pct": round(100 * total / s.monthly_ai_budget_usd, 2) if s.monthly_ai_budget_usd else 0,
        "decisions": len(a.cost_events),
    }
