# TradePilot Arena 🏟️

> AI 股票交易 Agent 模拟盘竞技场 · AI Stock-Trading Agent Paper-Trading Arena

---

## 🇨🇳 中文说明（默认）

### 这个软件做什么？

**TradePilot Arena** 是一个**只给你一个人本地使用**的私人 Web 软件。它让多个 AI 交易 Agent
（OpenAI / Claude / Gemini / DeepSeek）在**完全相同的市场数据、相同规则、相同资金盘**下进行
**模拟盘（Paper Trading）**交易比赛，然后你可以在漂亮的中文 Dashboard 里观察：

- 哪个 Agent 表现更好
- 哪个 Agent 决策更稳定
- 哪个 Agent 风险控制更好

### ⚠️ 为什么默认是模拟盘？

- **默认 = 模拟盘 / Paper Trading / Simulation。** 第一版以模拟盘为核心。
- **不接真实券商、不下真实订单。** 真实交易相关功能只做未来扩展接口，默认关闭
  （`LIVE_TRADING_ENABLED=false`）。
- **不承诺盈利。** 本软件用于观察和研究 AI Agent 的决策行为，不是投资建议。
- **LLM 不能绕过风控。** 所有 AI 决策必须经过确定性的 Risk Engine 才能进入模拟成交。
- **不使用 Robinhood 非官方 private API。**

### 本地安装与启动

前置要求：已安装 [Docker](https://docs.docker.com/get-docker/) 和 Docker Compose。

```bash
# 1. 复制环境变量模板
cp .env.example .env

# 2. 一条命令启动所有服务
docker compose up -d

# 3. 打开浏览器
#    Dashboard:  http://localhost:3000
#    API:        http://localhost:8000
#    API Docs:   http://localhost:8000/docs
```

> 即使**没有任何 API key**，系统也会进入 **Demo 模式**，使用合成行情 + Mock LLM，
> 直接展示完整可用的模拟盘界面。

### 环境变量

见 [`.env.example`](./.env.example)，关键项：

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `APP_SECRET_KEY` | 本地加密 API key 用的密钥 | 必填 |
| `LOCAL_ADMIN_PASSWORD` | 本地登录密码 | `tradepilot` |
| `LIVE_TRADING_ENABLED` | 实盘开关（务必保持 false） | `false` |
| `PAPER_TRADING` | 模拟盘开关 | `true` |
| `DEMO_MODE` | Demo 模式（无 key 也能跑） | `true` |
| `DEFAULT_LANGUAGE` | 默认语言 | `zh-CN` |
| `DEFAULT_THEME` | 默认主题 | `system` |
| `MONTHLY_AI_BUDGET_USD` | 月度 AI 预算上限 | `50` |

### 默认登录方式

- 用户名：`admin`
- 密码：`.env` 中的 `LOCAL_ADMIN_PASSWORD`（默认 `tradepilot`）

### 如何添加 API key

1. 打开 **设置 → AI Provider**（`/settings/providers`）。
2. 在对应 Provider 卡片输入 API key（写 "Cloud API key" 视为 Anthropic Claude key）。
3. 点击 **Test Connection** 验证，再点 **Refresh Models** 刷新模型列表。
4. key 只发送一次到后端，后端用 `APP_SECRET_KEY` 加密保存，UI 永远只显示 masked key。

### 如何刷新模型 / 选择模型

- 设置页每个 Provider 有 **Refresh Models** 按钮，会拉取该 Provider 当前可用模型。
- 进入 **Agent 详情 → Settings** 选择主模型和 fallback 模型。模型名**不写死在业务逻辑里**。

### 如何启动模拟盘 / 查看 Agent 表现 / 看决策日志

- Dashboard 顶部点击 **开始 / Start Simulation**，Agent Runner 会按间隔给所有 Agent 同一份市场快照。
- 首页即 **模拟盘总览**：排行榜、权益曲线、Agent 卡片、实时决策流、风险概览。
- **决策日志**（`/decisions`）用浅显中文展示每一次决策的结论、证据、检查表、风控结果。

### 如何重置模拟盘 / 导出日志

- **设置 → 高级**（`/settings/advanced`）：导出（JSON/CSV）后再重置；所有重置都需二次确认。
- 顶部 **紧急停止 / Kill Switch** 会暂停所有 Agent、取消所有模拟挂单。

### 如何运行测试

```bash
# 后端
cd apps/api && pip install -e ".[dev]" && pytest -q

# 前端
cd apps/web && npm install && npm test
```

### 如何未来部署到 Google Cloud

见 [`infra/terraform`](./infra/terraform) 与 [`docs/architecture.md`](./docs/architecture.md)。
本地 Docker Compose 是 MVP 重点，云部署只是可选骨架。

---

## 🇬🇧 English

**TradePilot Arena** is a private, single-user, **local-first** web app that runs multiple
AI trading agents (OpenAI / Claude / Gemini / DeepSeek) in a **paper-trading** competition on
**identical market data, identical rules, and identical starting capital**, so you can observe
which agent performs better, decides more consistently, and manages risk best.

**Paper trading is the default and the core.** No real broker orders. No profit promises.
LLMs cannot bypass the deterministic Risk Engine. Live trading is a future, disabled-by-default
extension (`LIVE_TRADING_ENABLED=false`). No Robinhood unofficial private APIs.

```bash
cp .env.example .env
docker compose up -d
# Dashboard http://localhost:3000 · API http://localhost:8000 · Docs /docs
```

With **no API keys**, the app runs in **Demo mode** (synthetic market data + mock LLMs) and shows
a fully usable dashboard. See `docs/` for architecture, safety, local setup, API-key management,
the simulation engine, and the agent decision protocol.

---

## 项目结构 / Project Layout

```
tradepilot-arena/
  apps/web            Next.js dashboard (zh-CN default, en-US toggle, dark/light)
  apps/api            FastAPI backend + domain core (risk, broker, simulation, providers)
  services/*          agent-runner, market-data, simulation-engine, risk/strategy, backtester, broker stubs
  packages/*          shared-types, ui-tokens, i18n, indicators, config
  infra/*             docker, terraform (Google Cloud skeleton)
  scripts/*           seed_demo_data, run_backtest, reset_simulation, export_logs
  tests/*             unit, integration, e2e
  docs/*              architecture, safety, local-setup, api-key-management, simulation-engine, agent-decision-protocol
```

See [`AGENTS.md`](./AGENTS.md) for coding-agent conventions.
