"""FastAPI application entrypoint.

Mounts all routers and the WebSocket events endpoint. The browser talks only to this API;
it never calls broker or LLM provider APIs directly.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from tradepilot.api import (
    agents,
    decisions,
    market,
    providers,
    reports,
    risk,
    settings as settings_routes,
    simulation,
    ws,
)
from tradepilot.config import get_settings

app = FastAPI(
    title="TradePilot Arena API",
    version="0.1.0",
    description="AI trading-agent paper-trading arena. Paper trading only; live trading disabled.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # single-user local app
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health() -> dict:
    s = get_settings()
    return {
        "status": "ok",
        "mode": "paper",
        "demo_mode": s.demo_mode,
        "live_trading_enabled": s.live_trading_enabled,
        "version": app.version,
    }


for module in (
    simulation, agents, providers, decisions, risk, market, settings_routes, reports, ws,
):
    app.include_router(module.router)
