from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from tradepilot.state import get_arena

router = APIRouter(tags=["ws"])


@router.websocket("/ws/events")
async def events(ws: WebSocket) -> None:
    """Pushes periodic leaderboard / equity / status updates to the dashboard.

    Event types mirror the spec: market_snapshot, agent_status, decision_created,
    order_created, fill_created, equity_updated, risk_event, provider_status,
    cost_updated, leaderboard_updated. This build emits a consolidated tick.
    """
    await ws.accept()
    arena = get_arena()
    try:
        while True:
            payload = {
                "type": "leaderboard_updated",
                "leaderboard": arena.leaderboard(),
                "running": arena.global_state.simulation_running,
                "kill_switch": arena.global_state.kill_switch_active,
                "cost_usd": round(arena.total_cost(), 4),
            }
            await ws.send_text(json.dumps(payload, default=str))
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        return
