# 架构 / Architecture

## 总览
```
┌──────────────┐     HTTP/WS      ┌──────────────────────────────────────────┐
│  web (Next)  │ ───────────────▶ │  api (FastAPI)                            │
│  Dashboard   │ ◀─────────────── │  routers + WebSocket /ws/events           │
└──────────────┘                  │                                           │
                                   │  tradepilot core (importable):            │
┌──────────────┐                   │   schemas · risk · broker · simulation    │
│ agent-runner │ ── run rounds ──▶ │   providers · marketdata · arena          │
└──────────────┘                   └───────────────┬───────────────┬──────────┘
┌──────────────┐                                   │               │
│ market-data  │                              ┌─────▼─────┐   ┌─────▼─────┐
└──────────────┘                              │ postgres  │   │  redis    │
┌──────────────────┐                          └───────────┘   └───────────┘
│ simulation-engine│
└──────────────────┘
```

## 服务 (docker-compose)
`web`, `api`, `agent-runner`, `market-data`, `simulation-engine`, `postgres`, `redis` —
全部 `restart: unless-stopped`，持久化卷：`postgres_data`, `redis_data`, `app_logs`,
`market_data_cache`。

## 后端核心 (`apps/api/tradepilot`)
- `schemas/` — `TradingDecision` 协议 + 共享枚举。
- `risk/` — 确定性 Risk Engine。
- `broker/` — `PaperBroker`（完整）+ 券商 disabled stub。
- `marketdata/` — `SyntheticMarketDataProvider`（demo）+ CSV replay / 真实数据 stub。
- `providers/` — 统一 `LLMProvider` 接口 + 4 个 Provider（含 mock mode）+ Model Registry。
- `arena.py` — 仿真状态 + 决策轮编排（公平性保证）。
- `api/` — FastAPI routers。

## 前端 (`apps/web`)
Next.js App Router · TypeScript · Tailwind · next-themes（深浅色）· 自定义 i18n（zh/en）·
TanStack Query · Recharts · TradingView Lightweight Charts。语义视觉系统在 `lib/semantic.ts`。

## 公平性 (Fairness)
每轮一个 `MarketSnapshot` 发给所有启用 Agent；相同风控/滑点/手续费/期权定价；Agent 互不可见
当轮决策；单个 Provider 报错被 try/except 隔离；每个决策记录 `input_hash` 与 `snapshot_id`。

## Google Cloud（可选）
Cloud Run（web/api）· Compute Engine/GKE（agent-runner 常驻）· Secret Manager（密钥）·
Pub/Sub（事件总线）· Cloud SQL/Postgres · BigQuery（分析/审计）· Cloud Logging/Monitoring。
Terraform 骨架见 [`infra/terraform`](../infra/terraform)。**本地 Docker Compose 是 MVP 重点。**
