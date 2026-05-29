from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from tradepilot.crypto import mask
from tradepilot.providers.registry import build_provider
from tradepilot.schemas.enums import Provider
from tradepilot.state import get_arena

router = APIRouter(prefix="/providers", tags=["providers"])

# In-memory store of (encrypted) keys for the single local user. The browser only ever
# receives masked keys. Persistence to DB would mirror this.
_ENCRYPTED_KEYS: dict[str, str] = {}
_PLAIN_KEYS: dict[str, str] = {}


def _provider(p: str) -> Provider:
    try:
        return Provider(p)
    except ValueError:
        raise HTTPException(404, "unknown provider")


@router.get("")
def list_providers() -> list[dict]:
    a = get_arena()
    out = []
    for p in Provider:
        entry = a.registry.get(p)
        has_key = bool(_PLAIN_KEYS.get(p.value))
        out.append({
            "provider": p.value,
            "display_name": {"openai": "OpenAI", "anthropic": "Anthropic Claude",
                             "gemini": "Google Gemini", "deepseek": "DeepSeek"}[p.value],
            "status": "connected" if has_key else "missing_key",
            "masked_key": mask(_PLAIN_KEYS.get(p.value, "")),
            "models": entry.models,
            "default_model": entry.default,
            "fallback_model": entry.fallback,
            "refreshed_at": entry.refreshed_at.isoformat(),
            "enabled": True,
        })
    return out


class KeyBody(BaseModel):
    api_key: str


@router.post("/{provider}/key")
def save_key(provider: str, body: KeyBody) -> dict:
    from tradepilot.crypto import encrypt
    p = _provider(provider)
    # NOTE: write a "Cloud API key" under Anthropic per product rules upstream in UI.
    _ENCRYPTED_KEYS[p.value] = encrypt(body.api_key)
    _PLAIN_KEYS[p.value] = body.api_key
    # rebuild the agent's provider with the real key
    arena = get_arena()
    arena.providers[p.value] = build_provider(p, body.api_key, mock=False)
    return {"provider": p.value, "status": "connected", "masked_key": mask(body.api_key)}


@router.delete("/{provider}/key")
def delete_key(provider: str) -> dict:
    p = _provider(provider)
    _ENCRYPTED_KEYS.pop(p.value, None)
    _PLAIN_KEYS.pop(p.value, None)
    arena = get_arena()
    arena.providers[p.value] = build_provider(p, "", mock=True)
    return {"provider": p.value, "status": "missing_key"}


@router.post("/{provider}/test")
def test_connection(provider: str) -> dict:
    p = _provider(provider)
    key = _PLAIN_KEYS.get(p.value, "")
    llm = build_provider(p, key, mock=not key)
    h = llm.validate_key()
    return {"provider": p.value, "status": h.status, "detail": h.detail}


@router.post("/{provider}/refresh-models")
def refresh_models(provider: str) -> dict:
    p = _provider(provider)
    arena = get_arena()
    key = _PLAIN_KEYS.get(p.value, "")
    llm = build_provider(p, key, mock=not key)
    entry = arena.registry.refresh(p, llm)
    return {"provider": p.value, "models": entry.models,
            "refreshed_at": entry.refreshed_at.isoformat()}


@router.get("/{provider}/models")
def get_models(provider: str) -> dict:
    p = _provider(provider)
    entry = get_arena().registry.get(p)
    return {"provider": p.value, "models": entry.models,
            "default": entry.default, "fallback": entry.fallback}
