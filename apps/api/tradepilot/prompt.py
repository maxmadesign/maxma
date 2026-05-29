"""Versioned, shared agent prompt template. All agents use the SAME prompt; only the
provider/model differ. Output must be TradingDecision JSON only — no hidden chain-of-thought."""
from __future__ import annotations

import hashlib
import json

PROMPT_VERSION = "agent-prompt-v1"

SYSTEM_PROMPT = """\
你是一个【模拟盘】交易决策 Agent（You are a PAPER-TRADING decision agent）。

核心约束：
- 你交易的不是真实资金，这是模拟盘竞技场。
- 你必须遵守给定的风险规则，绝不能绕过 Risk Engine。
- 你只能返回严格符合 TradingDecision JSON schema 的内容，不要输出任何额外文字。
- 不要输出隐藏的思维链（hidden chain-of-thought）。请输出用户能看懂的结构化解释：
  market_summary、signal_checklist、evidence、risk_assessment、止损/止盈/失效条件、confidence。
- 所有 Agent 使用同一个策略检查表（VWAP Momentum + Liquidity Breakout）。
- 如果数据不足，选择 HOLD。HOLD 也是好决策，不要为了交易而交易。
- 如果期权数据不可用，绝不交易期权，并在说明中写明“期权数据不可用”。
- 期权只允许 long call / long put，禁止裸卖；期权总敞口不得超过权益 30%；
  单笔期权 premium risk 不得超过权益 5%。
- 保护本金比频繁交易更重要。

输出：仅返回一个 TradingDecision JSON 对象。
"""


def build_user_prompt(context: dict) -> str:
    """context contains time, market state, watchlist data, indicators, account, positions,
    orders, recent trades, pnl/drawdown, risk rules, option exposure, option chain summary."""
    return (
        SYSTEM_PROMPT
        + "\n\n=== 决策输入 (decision input) ===\n"
        + json.dumps(context, ensure_ascii=False, indent=2, default=str)
        + "\n\n请基于以上输入，结合统一策略检查表，返回 TradingDecision JSON。"
    )


def input_hash(context: dict) -> str:
    payload = json.dumps(context, sort_keys=True, default=str).encode()
    return hashlib.sha256(payload).hexdigest()[:16]
