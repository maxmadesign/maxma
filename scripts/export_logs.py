#!/usr/bin/env python3
"""Export decisions / trades / risk events / cost to JSON+CSV files under ./data/export."""
from __future__ import annotations

import json
import os
import urllib.request
from pathlib import Path

BASE = os.getenv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:8000")
OUT = Path("./data/export")


def fetch(path: str):
    with urllib.request.urlopen(f"{BASE}{path}") as r:
        return r.read().decode()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "decisions.json").write_text(fetch("/decisions?limit=1000"))
    (OUT / "trades.csv").write_text(fetch("/export/trades.csv"))
    (OUT / "report.json").write_text(fetch("/reports/simulation"))
    (OUT / "risk_events.json").write_text(fetch("/risk/events"))
    print(f"Exported to {OUT.resolve()}")


if __name__ == "__main__":
    main()
