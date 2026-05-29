# broker-ibkr (future extension — DISABLED)

Interactive Brokers connector. **Disabled stub only.** Implemented as `IBKRBroker` in
[`apps/api/tradepilot/broker/base.py`](../../apps/api/tradepilot/broker/base.py); every method
raises until live trading is explicitly enabled (`LIVE_TRADING_ENABLED=true`) with a user
second-confirmation. The browser must never call a broker directly. See `docs/safety.md`.
