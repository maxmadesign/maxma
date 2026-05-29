"""PaperBroker fills, stop-loss / take-profit, and PnL."""
from datetime import datetime, timezone

from tradepilot.broker.paper import PaperBroker
from tradepilot.domain import Account, Order
from tradepilot.schemas.enums import OrderSide, OrderStatus, OrderType


def _now():
    return datetime.now(timezone.utc)


def _order(symbol="AAPL", qty=10, side=OrderSide.LONG, otype=OrderType.MARKET, **kw):
    return Order(id="o1", agent_id="x", symbol=symbol, side=side, order_type=otype,
                 quantity=qty, created_at=_now(), updated_at=_now(), **kw)


def test_market_buy_fills_and_reduces_cash():
    b = PaperBroker()
    acct = Account(agent_id="x")
    r = b.place_order(acct, _order(), ref_price=100.0)
    assert r.order.status == OrderStatus.FILLED
    assert "AAPL" in acct.positions
    assert acct.cash < 10_000


def test_take_profit_triggers():
    b = PaperBroker()
    acct = Account(agent_id="x")
    b.place_bracket_order(acct, _order(stop_loss=95.0, take_profit=110.0), ref_price=100.0)
    results = b.mark_and_check_exits(acct, {"AAPL": 111.0})
    assert results and results[0].closed_trade_pnl != 0
    assert "AAPL" not in acct.positions


def test_stop_loss_triggers_and_records_loss():
    b = PaperBroker()
    acct = Account(agent_id="x")
    b.place_bracket_order(acct, _order(stop_loss=95.0, take_profit=120.0), ref_price=100.0)
    results = b.mark_and_check_exits(acct, {"AAPL": 94.0})
    assert results and results[0].closed_trade_pnl < 0
    assert acct.consecutive_losses == 1


def test_trailing_stop_raises_with_price():
    b = PaperBroker()
    acct = Account(agent_id="x")
    b.place_bracket_order(acct, _order(trailing_stop=2.0), ref_price=100.0)
    b.mark_and_check_exits(acct, {"AAPL": 110.0})  # trailing -> 108
    pos = acct.positions["AAPL"]
    assert pos.stop_loss is not None and pos.stop_loss >= 108.0
    results = b.mark_and_check_exits(acct, {"AAPL": 107.0})  # below trailing stop
    assert results and "AAPL" not in acct.positions


def test_flatten_all():
    b = PaperBroker()
    acct = Account(agent_id="x")
    b.place_order(acct, _order(symbol="AAPL"), 100.0)
    b.place_order(acct, _order(symbol="MSFT"), 50.0)
    b.flatten_all_simulated(acct, {"AAPL": 101.0, "MSFT": 51.0})
    assert acct.positions == {}
