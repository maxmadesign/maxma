from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from tradepilot.state import get_arena

router = APIRouter(prefix="/risk", tags=["risk"])


@router.get("/status")
def status() -> dict:
    a = get_arena()
    return {
        "kill_switch": a.global_state.kill_switch_active,
        "simulation_running": a.global_state.simulation_running,
        "paused_agents": [x.id for x in a.agents.values() if x.paused],
        "rejected_orders": len(a.risk_events),
        "settings": a.risk_engine.settings.model_dump(),
    }


@router.get("/events")
def events(limit: int = 100, agent_id: str | None = None) -> list[dict]:
    a = get_arena()
    evs = a.risk_events
    if agent_id:
        evs = [e for e in evs if e.agent_id == agent_id]
    return [e.model_dump() | {"timestamp": e.timestamp.isoformat()} for e in reversed(evs[-limit:])]


@router.patch("/settings")
def update_settings(body: dict) -> dict:
    a = get_arena()
    s = a.risk_engine.settings
    for k, v in body.items():
        if hasattr(s, k):
            setattr(s, k, v)
    return s.model_dump()


@router.post("/kill-switch")
def kill_switch(close_positions: bool = True) -> dict:
    a = get_arena()
    a.kill_switch(close_positions=close_positions)
    return {"kill_switch": True}


class TypedConfirm(BaseModel):
    confirmation: str  # must equal a required phrase


@router.post("/clear-kill-switch")
def clear_kill_switch(body: TypedConfirm) -> dict:
    if body.confirmation.strip().upper() != "CLEAR":
        raise HTTPException(400, "type CLEAR to confirm")
    a = get_arena()
    a.clear_kill_switch()
    return {"kill_switch": False}


@router.post("/flatten-all-simulated")
def flatten_all(body: TypedConfirm) -> dict:
    if body.confirmation.strip().upper() != "FLATTEN":
        raise HTTPException(400, "type FLATTEN to confirm")
    a = get_arena()
    prices = a._current_prices()
    n = 0
    for acct in a.accounts.values():
        n += len(a.broker.flatten_all_simulated(acct, prices))
    return {"flattened": n}
