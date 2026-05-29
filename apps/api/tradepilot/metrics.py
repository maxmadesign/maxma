"""Performance metrics + the composite AgentScore (rank not by return alone)."""
from __future__ import annotations

from dataclasses import dataclass

from tradepilot.domain import Trade


def _closed(trades: list[Trade]) -> list[Trade]:
    return [t for t in trades if t.closed_at is not None]


def win_rate(trades: list[Trade]) -> float:
    c = _closed(trades)
    if not c:
        return 0.0
    wins = sum(1 for t in c if t.realized_pnl > 0)
    return wins / len(c)


def profit_factor(trades: list[Trade]) -> float:
    c = _closed(trades)
    gross_win = sum(t.realized_pnl for t in c if t.realized_pnl > 0)
    gross_loss = -sum(t.realized_pnl for t in c if t.realized_pnl < 0)
    if gross_loss == 0:
        return float("inf") if gross_win > 0 else 0.0
    return gross_win / gross_loss


def expectancy(trades: list[Trade]) -> float:
    c = _closed(trades)
    if not c:
        return 0.0
    return sum(t.realized_pnl for t in c) / len(c)


@dataclass
class AgentScore:
    total: float
    total_return: float
    drawdown_control: float
    profit_factor_score: float
    consistency: float
    risk_compliance: float
    validity: float


def agent_score(*, total_return_pct: float, max_drawdown_pct: float, pf: float,
                consistency_pct: float, risk_violations: int, total_decisions: int,
                invalid_decisions: int) -> AgentScore:
    """Weights: 35% return, 25% drawdown control, 15% PF, 10% consistency,
    10% risk compliance, 5% decision validity. Each sub-score normalised to 0-100."""
    ret = max(0.0, min(100.0, 50 + total_return_pct * 200))          # +25% => 100
    dd = max(0.0, 100.0 - max_drawdown_pct * 400)                     # 25% dd => 0
    pf_clamped = 5.0 if pf == float("inf") else pf
    pf_s = max(0.0, min(100.0, (pf_clamped / 2.0) * 100))            # PF 2.0 => 100
    cons = max(0.0, min(100.0, consistency_pct))
    risk = max(0.0, 100.0 - risk_violations * 10)
    validity = 100.0 if total_decisions == 0 else max(
        0.0, 100.0 * (1 - invalid_decisions / total_decisions))
    total = (0.35 * ret + 0.25 * dd + 0.15 * pf_s + 0.10 * cons
             + 0.10 * risk + 0.05 * validity)
    return AgentScore(round(total, 1), round(ret, 1), round(dd, 1), round(pf_s, 1),
                      round(cons, 1), round(risk, 1), round(validity, 1))
