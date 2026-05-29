from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from tradepilot.state import get_arena

router = APIRouter(prefix="/agents", tags=["agents"])


def _agent_view(arena, agent_id: str) -> dict:
    a = arena.agents[agent_id]
    acct = arena.accounts[agent_id]
    summary = arena.broker.get_account_summary(acct)
    return {
        "id": a.id, "name": a.name, "provider": a.provider.value, "accent": a.accent,
        "model": a.model, "fallback_model": a.fallback_model,
        "enabled": a.enabled, "paused": a.paused, "status": a.status.value,
        "last_action": a.last_action,
        "last_decision_at": a.last_decision_at.isoformat() if a.last_decision_at else None,
        "account": summary,
        "positions": [p.model_dump() for p in acct.positions.values()],
        "open_orders": len(arena.broker.get_open_orders(acct)),
    }


@router.get("")
def list_agents() -> list[dict]:
    a = get_arena()
    return [_agent_view(a, aid) for aid in a.agents]


@router.get("/{agent_id}")
def get_agent(agent_id: str) -> dict:
    a = get_arena()
    if agent_id not in a.agents:
        raise HTTPException(404, "agent not found")
    return _agent_view(a, agent_id)


class AgentPatch(BaseModel):
    model: str | None = None
    fallback_model: str | None = None


@router.patch("/{agent_id}")
def patch_agent(agent_id: str, body: AgentPatch) -> dict:
    a = get_arena()
    if agent_id not in a.agents:
        raise HTTPException(404, "agent not found")
    agent = a.agents[agent_id]
    if body.model:
        agent.model = a.registry.resolve_model(agent.provider, body.model)
    if body.fallback_model:
        agent.fallback_model = body.fallback_model
    return _agent_view(a, agent_id)


def _toggle(agent_id: str, **kwargs):
    a = get_arena()
    if agent_id not in a.agents:
        raise HTTPException(404, "agent not found")
    for k, v in kwargs.items():
        setattr(a.agents[agent_id], k, v)
    return _agent_view(a, agent_id)


@router.post("/{agent_id}/enable")
def enable(agent_id: str):
    return _toggle(agent_id, enabled=True)


@router.post("/{agent_id}/disable")
def disable(agent_id: str):
    from tradepilot.schemas.enums import AgentStatus
    return _toggle(agent_id, enabled=False, status=AgentStatus.DISABLED)


@router.post("/{agent_id}/pause")
def pause(agent_id: str):
    from tradepilot.schemas.enums import AgentStatus
    return _toggle(agent_id, paused=True, status=AgentStatus.PAUSED)


@router.post("/{agent_id}/resume")
def resume(agent_id: str):
    from tradepilot.schemas.enums import AgentStatus
    return _toggle(agent_id, paused=False, status=AgentStatus.IDLE)


@router.post("/{agent_id}/reset")
def reset_agent(agent_id: str):
    a = get_arena()
    if agent_id not in a.agents:
        raise HTTPException(404, "agent not found")
    a.reset_agent(agent_id)
    return _agent_view(a, agent_id)


@router.post("/{agent_id}/run-decision-now")
def run_now(agent_id: str):
    a = get_arena()
    if agent_id not in a.agents:
        raise HTTPException(404, "agent not found")
    a.run_round(market_open=True, agent_ids=[agent_id])
    return _agent_view(a, agent_id)


@router.get("/{agent_id}/decisions")
def agent_decisions(agent_id: str, limit: int = 50) -> list[dict]:
    a = get_arena()
    recs = [d for d in a.decisions if d.agent_id == agent_id][-limit:]
    return [vars(r) | {"timestamp": r.timestamp.isoformat()} for r in reversed(recs)]
