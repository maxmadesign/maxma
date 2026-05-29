# strategy-engine

The shared **VWAP Momentum + Liquidity Breakout** strategy context + checklist lives in
[`apps/api/tradepilot/strategy.py`](../../apps/api/tradepilot/strategy.py) and indicators in
[`apps/api/tradepilot/indicators.py`](../../apps/api/tradepilot/indicators.py).

This strategy is **not** a guaranteed-profit system — it provides every agent the same market
context and decision checklist. The Risk Engine remains the final execution gate.
