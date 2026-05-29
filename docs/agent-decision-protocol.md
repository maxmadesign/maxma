# Agent 决策协议 / Agent Decision Protocol

所有 Agent 使用**同一个**版本化 Prompt（`apps/api/tradepilot/prompt.py`，`PROMPT_VERSION`），
只是 provider/model 不同。输出必须是 **`TradingDecision` JSON only**。

## 不暴露隐藏思维链
不要求模型输出 hidden chain-of-thought。要求输出**用户能看懂**的结构化解释：
`market_summary` · `signal_checklist` · `selected_action` · `evidence` · `risk_assessment`
· `position_sizing_reason` · `stop_loss_reason` · `take_profit_reason` ·
`invalidation_condition` · `confidence_score` · `uncertainty_notes` ·
`alternatives_considered` · `final_summary_for_user`。决策日志用浅显中文，非交易者也能读懂。

## 结构化输出与校验
- 严格 Pydantic 校验（`schemas/decision.py`）。
- 各 Provider 用其最佳结构化方式：OpenAI structured outputs / Gemini JSON schema /
  Claude tool use / DeepSeek JSON mode（真实实现在各 Provider 子类，demo 用 mock）。
- 不符合 schema → 自动重试一次 repair prompt → 仍失败标记 `INVALID_RESPONSE`，**不下单**，
  决策日志清楚显示失败原因。

## Schema（节选）
```
TradingDecision { agent_id, provider, model, timestamp, market_regime,
  overall_action(trade|hold|reduce_risk|close_positions), decisions[SymbolDecision],
  portfolio_notes, confidence_score(0-100), final_summary_for_user }

SymbolDecision { symbol, asset_type(stock|etf|option), action(buy|sell|hold|reduce|close),
  side(long|short|none), order_type(market|limit|stop|bracket), quantity, limit_price,
  stop_loss, take_profit, trailing_stop, option_contract?, expected_holding_period,
  thesis_summary, evidence[], signal_checklist[ChecklistItem], risk_assessment,
  position_sizing_reason, stop_loss_reason, take_profit_reason, invalidation_condition,
  uncertainty_notes, confidence_score, reason_tags[] }

ChecklistItem { label, passed, value, explanation }
OptionContract { underlying, type(call|put), strike, expiration, dte, premium, bid, ask, mid, iv }
```

## 决策输入
当前时间、是否开盘、市场状态、Watchlist 数据、技术指标、自身模拟账户、当前持仓/订单、
最近交易与盈亏/回撤、风控规则、期权敞口、期权链摘要（若有）、统一策略检查表。

## 记录的元数据
`prompt_version` · `strategy_version` · `risk_version` · `model` · `provider` · `input_hash`
· `market_snapshot_id`。

## 行为准则（Prompt 内置）
你在交易模拟盘、不能绕过 Risk Engine、数据不足就 HOLD、HOLD 也是好决策、不要为交易而交易、
期权数据不可用就不碰期权、永不超期权敞口、保护本金优先。
