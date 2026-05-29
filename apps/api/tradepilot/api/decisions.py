from __future__ import annotations

from fastapi import APIRouter, HTTPException

from tradepilot.state import get_arena

router = APIRouter(prefix="/decisions", tags=["decisions"])


def _serialize(r) -> dict:
    return vars(r) | {"timestamp": r.timestamp.isoformat()}


@router.get("")
def list_decisions(limit: int = 100, agent_id: str | None = None,
                   action: str | None = None, valid: bool | None = None) -> list[dict]:
    a = get_arena()
    recs = a.decisions
    if agent_id:
        recs = [d for d in recs if d.agent_id == agent_id]
    if action:
        recs = [d for d in recs if d.overall_action == action]
    if valid is not None:
        recs = [d for d in recs if d.valid == valid]
    return [_serialize(r) for r in reversed(recs[-limit:])]


@router.get("/{decision_id}")
def get_decision(decision_id: str) -> dict:
    a = get_arena()
    for r in a.decisions:
        if r.id == decision_id:
            return _serialize(r)
    raise HTTPException(404, "decision not found")
