#!/usr/bin/env python3
"""Reset the running simulation via the API (requires the api service to be up)."""
from __future__ import annotations

import os
import urllib.request

BASE = os.getenv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:8000")


def main() -> None:
    req = urllib.request.Request(f"{BASE}/simulation/reset", method="POST")
    with urllib.request.urlopen(req) as r:
        print(r.read().decode())


if __name__ == "__main__":
    main()
