# 模拟引擎 / Simulation Engine

每个 Agent 初始资金 `starting_cash = 10,000 USD`，独立维护现金、持仓、权益、买入力、订单、
成交、交易、风险事件、决策、盈亏、回撤、期权敞口、胜率、盈亏比、期望值等。

## PaperBroker（`apps/api/tradepilot/broker/paper.py`）
- `place_order` / `place_bracket_order` / `cancel_order` / `get_positions` / `get_open_orders`
  / `get_account_summary` / `flatten_position` / `flatten_all_simulated`
- 模拟：bid/ask 价差、滑点（市价单 2bps）、手续费（股票 $0.005/股，期权 $0.65/张）、
  拒单、stale 行情、休市状态。
- 退出：`mark_and_check_exits` 每个 tick 标记持仓并触发 **止损 / 止盈 / 移动止损**；
  支持 bracket、time-based exit。

## 股票仓位计算
```
risk_dollars      = equity * risk_per_trade_pct
risk_per_share    = abs(entry - stop_loss)
shares_by_risk    = floor(risk_dollars / risk_per_share)
shares_by_notional= floor(equity * max_position_notional_pct / entry)
shares            = min(shares_by_risk, shares_by_notional)
```

## 期权模拟
- 仅 long call / long put；禁止裸卖。
- `premium_risk = mid * 100 * contracts`
- `premium_risk > equity * 5%` → 拒绝（单笔限额）。
- `当前期权敞口 + premium_risk > equity * 30%` → 拒绝（总敞口限额）。
- 缺少可靠报价 → 拒绝并记录“期权数据不可用”。
- Dashboard 显示期权敞口 Gauge（30% 红线）。

## 公平性
所有 Agent 同一时间收到**完全相同**的 `MarketSnapshot`，使用相同风控/滑点/手续费/期权定价；
Agent 看不到其他 Agent 当轮决策；每次决策记录 `input_hash`。

## 回测（`services/backtester`）
策略-only 回测可用：`python scripts/run_backtest.py --strategy vwap_momentum --symbol SPY`。
决策重放 / 市场重放为后续扩展。
