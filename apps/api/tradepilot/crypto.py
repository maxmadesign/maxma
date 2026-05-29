"""API-key encryption at rest (local mode).

Keys are encrypted with a key derived from APP_SECRET_KEY. The browser sends a key exactly
once; the backend stores only ciphertext and ever returns only a masked form.
Cloud mode would use Secret Manager instead (see docs/api-key-management.md).
"""
from __future__ import annotations

import base64
import hashlib

from tradepilot.config import get_settings


def _fernet():
    from cryptography.fernet import Fernet

    secret = get_settings().app_secret_key.encode()
    key = base64.urlsafe_b64encode(hashlib.sha256(secret).digest())
    return Fernet(key)


def encrypt(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(token: str) -> str:
    return _fernet().decrypt(token.encode()).decode()


def mask(plaintext: str) -> str:
    if not plaintext:
        return ""
    if len(plaintext) <= 8:
        return "••••"
    return f"{plaintext[:4]}••••••••{plaintext[-4:]}"
