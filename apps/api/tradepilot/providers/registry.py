"""Model Registry + concrete provider classes.

Model names are NOT hardcoded into business logic — they live here as defaults/fallbacks and
can be refreshed at runtime and overridden per-agent in settings.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from tradepilot.providers.base import LLMProvider
from tradepilot.schemas.enums import Provider


# Default + fallback model ids per provider. Prefer the latest stable/frontier/reasoning model;
# fall back if unavailable. Refreshed at runtime via list_models().
DEFAULT_MODELS: dict[Provider, dict] = {
    Provider.OPENAI: {
        "default": "gpt-5.1",
        "fallback": "gpt-4.1",
        "models": ["gpt-5.1", "gpt-5", "gpt-4.1", "o4-mini"],
    },
    Provider.ANTHROPIC: {
        "default": "claude-opus-4-8",
        "fallback": "claude-sonnet-4-6",
        "models": ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"],
    },
    Provider.GEMINI: {
        "default": "gemini-3-pro",
        "fallback": "gemini-2.5-pro",
        "models": ["gemini-3-pro", "gemini-2.5-pro", "gemini-2.5-flash"],
    },
    Provider.DEEPSEEK: {
        "default": "deepseek-reasoner",
        "fallback": "deepseek-chat",
        "models": ["deepseek-reasoner", "deepseek-chat"],
    },
}


class OpenAIProvider(LLMProvider):
    provider_id = Provider.OPENAI
    # Real impl would use the Responses API with structured outputs.


class AnthropicProvider(LLMProvider):
    provider_id = Provider.ANTHROPIC
    # Real impl would use tool-use / structured output for strict JSON.


class GeminiProvider(LLMProvider):
    provider_id = Provider.GEMINI
    # Real impl would use JSON-schema structured output.


class DeepSeekProvider(LLMProvider):
    provider_id = Provider.DEEPSEEK
    # Real impl would use JSON output mode.


_PROVIDER_CLASSES = {
    Provider.OPENAI: OpenAIProvider,
    Provider.ANTHROPIC: AnthropicProvider,
    Provider.GEMINI: GeminiProvider,
    Provider.DEEPSEEK: DeepSeekProvider,
}


def build_provider(provider: Provider, api_key: str = "", *, mock: bool = True) -> LLMProvider:
    return _PROVIDER_CLASSES[provider](api_key=api_key, mock=mock)


@dataclass
class RegistryEntry:
    provider: Provider
    models: list[str]
    default: str
    fallback: str
    refreshed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class ModelRegistry:
    """Holds available models per provider; refreshable at startup or from the settings page."""

    def __init__(self) -> None:
        self._entries: dict[Provider, RegistryEntry] = {}
        for p, cfg in DEFAULT_MODELS.items():
            self._entries[p] = RegistryEntry(
                provider=p, models=list(cfg["models"]),
                default=cfg["default"], fallback=cfg["fallback"],
            )

    def get(self, provider: Provider) -> RegistryEntry:
        return self._entries[provider]

    def all(self) -> dict[Provider, RegistryEntry]:
        return self._entries

    def refresh(self, provider: Provider, llm: Optional[LLMProvider] = None) -> RegistryEntry:
        entry = self._entries[provider]
        if llm is not None:
            try:
                models = llm.list_models()
                if models:
                    entry.models = models
                    if entry.default not in models:
                        entry.default = models[0]
            except Exception:
                pass  # keep existing on failure
        entry.refreshed_at = datetime.now(timezone.utc)
        return entry

    def resolve_model(self, provider: Provider, requested: Optional[str]) -> str:
        entry = self._entries[provider]
        if requested and requested in entry.models:
            return requested
        if entry.default in entry.models:
            return entry.default
        return entry.fallback
