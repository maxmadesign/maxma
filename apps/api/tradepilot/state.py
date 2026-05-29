"""Process-wide Arena singleton + demo seeding.

In Demo mode (no API keys) we pre-run several decision rounds so the dashboard shows a
populated leaderboard, equity curves, decisions, trades and risk events immediately.
"""
from __future__ import annotations

from functools import lru_cache

from tradepilot.arena import Arena
from tradepilot.config import get_settings
from tradepilot.schemas.enums import Provider


def _collect_keys() -> dict[Provider, str]:
    s = get_settings()
    return {
        Provider.OPENAI: s.openai_api_key,
        Provider.ANTHROPIC: s.anthropic_api_key,
        Provider.GEMINI: s.gemini_api_key,
        Provider.DEEPSEEK: s.deepseek_api_key,
    }


def seed_demo(arena: Arena, rounds: int = 30) -> None:
    """Run mock rounds to populate the arena for an attractive first load."""
    arena.start()
    for _ in range(rounds):
        arena.run_round(market_open=True)


@lru_cache
def get_arena() -> Arena:
    arena = Arena(provider_keys=_collect_keys())
    if get_settings().demo_mode:
        seed_demo(arena)
    return arena
