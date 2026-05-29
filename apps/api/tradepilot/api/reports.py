from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

from tradepilot.state import get_arena

router = APIRouter(tags=["reports"])


@router.get("/portfolios")
def portfolios() -> list[dict]:
    a = get_arena()
    return [a.broker.get_account_summary(acct) for acct in a.accounts.values()]


@router.get("/positions")
def positions() -> list[dict]:
    a = get_arena()
    out = []
    for aid, acct in a.accounts.items():
        for p in acct.positions.values():
            out.append({"agent_id": aid} | p.model_dump())
    return out


@router.get("/orders")
def orders() -> list[dict]:
    a = get_arena()
    out = []
    for aid, acct in a.accounts.items():
        for o in a.broker.get_open_orders(acct):
            out.append(o.model_dump() | {"created_at": o.created_at.isoformat()})
    return out


@router.get("/trades")
def trades(agent_id: str | None = None, limit: int = 200) -> list[dict]:
    a = get_arena()
    ts = a.broker.trades
    if agent_id:
        ts = [t for t in ts if t.agent_id == agent_id]
    return [t.model_dump() | {
        "opened_at": t.opened_at.isoformat(),
        "closed_at": t.closed_at.isoformat() if t.closed_at else None,
    } for t in ts[-limit:]]


@router.get("/reports/simulation")
def simulation_report(lang: str = "zh-CN") -> dict:
    a = get_arena()
    lb = a.leaderboard()
    return {
        "language": lang,
        "generated_at": __import__("datetime").datetime.utcnow().isoformat(),
        "disclaimer": ("本报告仅用于观察模拟盘表现，不构成任何投资建议，不承诺盈利。"
                       if lang == "zh-CN" else
                       "Paper-trading observation only. Not investment advice. No profit is promised."),
        "leaderboard": lb,
        "total_decisions": len(a.decisions),
        "total_trades": len([t for t in a.broker.trades if t.closed_at]),
        "total_risk_events": len(a.risk_events),
        "total_cost_usd": round(a.total_cost(), 4),
    }


@router.post("/reports/generate")
def generate_report(lang: str = "zh-CN") -> dict:
    return simulation_report(lang)


@router.get("/export/trades.csv", response_class=PlainTextResponse)
def export_trades_csv() -> str:
    a = get_arena()
    lines = ["agent_id,symbol,side,quantity,entry_price,exit_price,realized_pnl,opened_at,closed_at,reason"]
    for t in a.broker.trades:
        lines.append(",".join(str(x) for x in [
            t.agent_id, t.symbol, t.side.value, t.quantity, t.entry_price, t.exit_price or "",
            t.realized_pnl, t.opened_at.isoformat(),
            t.closed_at.isoformat() if t.closed_at else "", t.reason_closed or "",
        ]))
    return "\n".join(lines)
