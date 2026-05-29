# AGENTS.md — Conventions for Coding Agents

This file tells AI coding agents (and humans) how to work safely in this repo.

## Project structure
- `apps/web` — Next.js App Router + TypeScript + Tailwind + shadcn/ui frontend.
- `apps/api` — FastAPI backend. The domain **core** lives in `apps/api/tradepilot/`
  (schemas, risk engine, paper broker, simulation engine, providers, market data) and is
  imported by the API and by the `services/*` workers.
- `services/*` — long-running workers: `agent-runner`, `market-data`, `simulation-engine`,
  `risk-engine`, `strategy-engine`, `backtester`, and disabled `broker-ibkr` / `broker-robinhood` stubs.
- `packages/*` — shared cross-cutting code: `shared-types`, `ui-tokens`, `i18n`, `indicators`, `config`.
- `infra/*`, `scripts/*`, `tests/*`, `docs/*`.

## Test commands
```bash
# Backend (run from apps/api)
pip install -e ".[dev]"
pytest -q

# Frontend (run from apps/web)
npm install
npm test
npm run lint
```
**You must run the relevant tests after every change.**

## Safety rules (non-negotiable)
1. **Never** default to live trading. `LIVE_TRADING_ENABLED` defaults to `false`.
2. **Never** let an LLM bypass the Risk Engine. LLMs propose; the deterministic Risk Engine decides.
3. **Never** hardcode secrets. API keys are encrypted at rest via `APP_SECRET_KEY` (local) or Secret Manager (cloud).
4. **Never** use Robinhood unofficial / private APIs. Broker connectors are stubs only.
5. The browser must never call broker or LLM provider APIs directly — always via the backend.
6. Options: long call / long put only. No naked shorts. Total option exposure ≤ 30% equity;
   single option premium risk ≤ 5% equity. If option data is unreliable, skip and log it.
7. Never promise profit anywhere in UI, docs, or reports.

## UI conventions
- Bento-grid, rounded cards, soft shadows, subtle borders, modern type scale. Not an admin panel.
- Every important state needs colour **and** a text label/Tag/Icon/Tooltip (never colour alone).
- Skeleton loading, beautiful empty states, recoverable error states, confirm dialogs for danger.
- Responsive, desktop/laptop first.

## i18n conventions
- Default `zh-CN`, toggle to `en-US` (persisted). System preference read on first visit; manual choice wins.
- **No hardcoded UI strings in components.** Use the `packages/i18n` dictionaries via `next-intl`.
- Chinese copy must be natural, not machine-translated.

## Semantic badge / token rules
- Use the shared semantic token system (`packages/ui-tokens`, `apps/web/lib/semantic.ts`).
- Do **not** scatter raw Tailwind colour classes for domain states. Use `ActionTag`, `StatusBadge`,
  `RiskBadge`, `ProviderBadge`, `AssetTypeBadge`, etc.

## Risk rules summary
See `services/risk-engine` and `apps/api/tradepilot/risk/engine.py`. Defaults per agent:
`risk_per_trade_pct=0.005`, `max_daily_loss_pct=0.015`, `max_weekly_loss_pct=0.04`,
`max_position_notional_pct=0.25`, `max_open_positions=3`, `max_trades_per_day=8`,
`pause_after_consecutive_losses=2`, `max_option_exposure_pct=0.30`,
`max_single_option_trade_risk_pct=0.05`, `no_naked_short_options=true`, `live_trading_enabled=false`.
Every rejection generates a `RiskEvent`.

## Decision protocol
LLMs return strict JSON validated by Pydantic (`TradingDecision`). No hidden chain-of-thought —
output human-readable structured explanations. On schema failure: one repair retry, else mark
`INVALID_RESPONSE` and place no order. Every decision records provider, model, prompt/strategy/risk
versions, `input_hash`, and `market_snapshot_id`.
