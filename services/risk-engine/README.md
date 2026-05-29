# risk-engine

The deterministic Risk Engine implementation lives in the importable core at
[`apps/api/tradepilot/risk/`](../../apps/api/tradepilot/risk/) so it can be unit-tested in
isolation and reused by the API and the agent-runner. This directory documents the service
boundary; in a distributed deployment the Risk Engine would run as its own worker consuming
proposed orders and emitting `RiskEvent`s.

**Rules summary:** see `AGENTS.md` and `docs/safety.md`. The LLM can never bypass this engine.
