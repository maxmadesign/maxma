from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from tradepilot.state import get_arena

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/snapshot")
def snapshot() -> dict:
    a = get_arena()
    snap = a.build_snapshot(market_open=True)
    return {
        "id": snap.id, "timestamp": snap.timestamp.isoformat(),
        "market_open": snap.market_open, "session": snap.session, "regime": snap.regime,
        "symbols": {s: {"price": ss.quote.price, "spread_bps": ss.quote.spread_bps,
                        "indicators": ss.indicators.model_dump()}
                    for s, ss in snap.symbols.items()},
    }


@router.get("/quote/{symbol}")
def quote(symbol: str) -> dict:
    q = get_arena().market.get_quote(symbol.upper())
    return q.model_dump() | {"timestamp": q.timestamp.isoformat()}


@router.get("/bars/{symbol}")
def bars(symbol: str, timeframe: str = "5m", limit: int = 100) -> list[dict]:
    out = get_arena().market.get_bars(symbol.upper(), timeframe, limit)
    return [{"time": int(b.time.timestamp()), "open": b.open, "high": b.high,
             "low": b.low, "close": b.close, "volume": b.volume} for b in out]


@router.get("/options/{symbol}")
def options(symbol: str) -> dict:
    chain = get_arena().market.get_options_chain(symbol.upper())
    if not chain:
        return {"available": False, "message": "期权数据不可用 / option data unavailable"}
    return {"available": True, **chain}


class WatchlistBody(BaseModel):
    symbols: list[str]


@router.patch("/watchlist")
def update_watchlist(body: WatchlistBody) -> dict:
    a = get_arena()
    a.watchlist = [s.strip().upper() for s in body.symbols if s.strip()]
    return {"watchlist": a.watchlist}
