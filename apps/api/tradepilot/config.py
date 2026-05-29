"""Application configuration loaded from environment variables.

All trading-safety defaults err on the side of caution: paper trading on, live trading off,
demo mode on so the app runs with no API keys.
"""
from __future__ import annotations

from functools import lru_cache

try:  # pydantic-settings is optional for pure-core unit tests
    from pydantic_settings import BaseSettings, SettingsConfigDict

    _HAS_SETTINGS = True
except Exception:  # pragma: no cover - fallback for minimal test envs
    _HAS_SETTINGS = False


if _HAS_SETTINGS:

    class Settings(BaseSettings):
        model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

        # Security
        app_secret_key: str = "dev-only-change-me"
        local_admin_password: str = "tradepilot"

        # Infra
        database_url: str = "postgresql+asyncpg://tradepilot:tradepilot@postgres:5432/tradepilot"
        redis_url: str = "redis://redis:6379/0"

        # Provider keys (optional)
        openai_api_key: str = ""
        anthropic_api_key: str = ""
        gemini_api_key: str = ""
        deepseek_api_key: str = ""

        # Trading safety
        live_trading_enabled: bool = False
        paper_trading: bool = True
        demo_mode: bool = True

        # UI
        default_language: str = "zh-CN"
        default_theme: str = "system"

        # Cost / runner
        monthly_ai_budget_usd: float = 50.0
        decision_interval_seconds: int = 300

else:  # pragma: no cover

    import os

    class Settings:  # minimal shim
        def __init__(self) -> None:
            self.app_secret_key = os.getenv("APP_SECRET_KEY", "dev-only-change-me")
            self.local_admin_password = os.getenv("LOCAL_ADMIN_PASSWORD", "tradepilot")
            self.database_url = os.getenv("DATABASE_URL", "")
            self.redis_url = os.getenv("REDIS_URL", "")
            self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
            self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY", "")
            self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")
            self.deepseek_api_key = os.getenv("DEEPSEEK_API_KEY", "")
            self.live_trading_enabled = os.getenv("LIVE_TRADING_ENABLED", "false").lower() == "true"
            self.paper_trading = os.getenv("PAPER_TRADING", "true").lower() == "true"
            self.demo_mode = os.getenv("DEMO_MODE", "true").lower() == "true"
            self.default_language = os.getenv("DEFAULT_LANGUAGE", "zh-CN")
            self.default_theme = os.getenv("DEFAULT_THEME", "system")
            self.monthly_ai_budget_usd = float(os.getenv("MONTHLY_AI_BUDGET_USD", "50"))
            self.decision_interval_seconds = int(os.getenv("DECISION_INTERVAL_SECONDS", "300"))


@lru_cache
def get_settings() -> "Settings":
    return Settings()
