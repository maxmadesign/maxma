# 安全设计 / Safety Design

> 一句话：**这是模拟盘。默认不碰真钱。LLM 不能绕过风控。**

## 1. 默认模拟盘 (Paper Trading by default)
- `PAPER_TRADING=true`、`LIVE_TRADING_ENABLED=false`、`DEMO_MODE=true` 为出厂默认。
- 没有任何 API key 时，系统进入 Demo 模式（合成行情 + Mock LLM），照样展示完整界面。
- 第一版**不接真实券商**、**不下真实订单**、**不承诺盈利**。

## 2. LLM 不能绕过风控 (LLM cannot bypass the Risk Engine)
执行链路是单向的：**LLM 提议 → 确定性 Risk Engine 审批 → PaperBroker 模拟成交。**
Risk Engine 是纯确定性逻辑（`apps/api/tradepilot/risk/engine.py`），与任何模型无关。
每一次拒绝都会生成一条 `RiskEvent` 并写入决策日志。

核心规则（每个 Agent）：

| 规则 | 默认值 |
| --- | --- |
| 单笔风险 risk_per_trade_pct | 0.5% |
| 每日最大亏损 | 1.5% |
| 每周最大亏损 | 4% |
| 单仓最大名义 | 25% |
| 最大持仓数 | 3 |
| 每日最大交易数 | 8 |
| 连续亏损暂停阈值 | 2 |
| **期权总敞口上限** | **30%** |
| **单笔期权 premium risk** | **5%** |
| 裸卖期权 | 禁止 |
| 实盘开关 | 关闭 |

期权规则：仅 long call / long put；无可靠报价则跳过并记录“期权数据不可用”。

## 3. 真实交易只是未来接口 (Live trading is a future, disabled interface)
- `IBKRBroker` / `RobinhoodBroker` 都是会抛异常的 disabled stub。
- 若未来启用，必须 `LIVE_TRADING_ENABLED=true` **且**用户二次确认。
- **不使用 Robinhood 非官方 / private API。** 仅在未来用官方 API。
- 浏览器**永远不能**直接调用券商或 LLM provider API，全部经由后端。

## 4. API Key 安全
见 [`api-key-management.md`](./api-key-management.md)。key 加密存储，UI 只显示掩码。

## 5. 成本与预算保护
四个 Agent 调用模型会产生费用。成本看板统计 token / 费用；达到 `MONTHLY_AI_BUDGET_USD`
预算后自动暂停 Agent 或暂停 simulation。

## 6. 紧急停止 (Kill Switch)
顶部栏常驻。触发需确认。激活后：暂停所有 Agent、取消所有模拟挂单、可选平掉所有模拟持仓、
阻止新决策，并全局显示红黑高危 `KILL_SWITCH` 状态。

## 7. 实盘前检查清单 (Live Readiness Checklist)
即使未来要上实盘，也需满足：≥20 个交易日、决策有效率 >95%、风险违规极低、最大回撤低于阈值、
盈利来自多个交易日而非一次期权暴利、日志完整、止损行为正常、PaperBroker 无异常、用户手动确认。
**即便如此，真实下单仍默认禁止。**
