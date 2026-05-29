from __future__ import annotations

from fastapi import APIRouter

from tradepilot.state import get_arena

router = APIRouter(prefix="/simulation", tags=["simulation"])


@router.get("/status")
def status() -> dict:
    a = get_arena()
    return {
        "running": a.global_state.simulation_running,
        "kill_switch": a.global_state.kill_switch_active,
        "agents": len([x for x in a.agents.values() if x.enabled]),
        "rounds": len({d.snapshot_id for d in a.decisions}),
        "total_decisions": len(a.decisions),
    }


@router.post("/start")
def start() -> dict:
    a = get_arena()
    a.start()
    return {"running": True}


@router.post("/pause")
def pause() -> dict:
    a = get_arena()
    a.pause()
    return {"running": False}


@router.post("/reset")
def reset() -> dict:
    a = get_arena()
    a.reset()
    return {"reset": True}


@router.get("/leaderboard")
def leaderboard() -> list[dict]:
    return get_arena().leaderboard()


@router.get("/equity-curves")
def equity_curves() -> dict:
    a = get_arena()
    series: dict[str, list[dict]] = {}
    for p in a.equity_curve:
        series.setdefault(p.agent_id, []).append(
            {"t": p.timestamp.isoformat(), "equity": p.equity, "drawdown_pct": p.drawdown_pct}
        )
    return series


@router.get("/metrics")
def metrics() -> dict:
    a = get_arena()
    lb = a.leaderboard()
    best = max(lb, key=lambda r: r["equity"]) if lb else None
    worst = max(lb, key=lambda r: r["max_drawdown_pct"]) if lb else None
    total_equity = sum(r["equity"] for r in lb)
    today_pnl = sum(r["daily_pnl"] for r in lb)
    rejects = sum(1 for e in a.risk_events)
    return {
        "total_equity": round(total_equity, 2),
        "best_agent": best["name"] if best else None,
        "max_drawdown_agent": worst["name"] if worst else None,
        "today_pnl": round(today_pnl, 2),
        "active_agents": len([x for x in a.agents.values() if x.enabled and not x.paused]),
        "decisions_today": len(a.decisions),
        "risk_rejections_today": rejects,
        "total_cost_usd": round(a.total_cost(), 4),
    }
