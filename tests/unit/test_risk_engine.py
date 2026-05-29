"""Risk Engine rule coverage."""
from datetime import date, datetime, timezone

import pytest

from tradepilot.domain import Account, Indicators, MarketSnapshot, Position, Quote, SymbolSnapshot
from tradepilot.risk.engine import GlobalRiskState, RiskEngine, option_premium_risk, position_size
from tradepilot.risk.settings import RiskSettings
from tradepilot.schemas.decision import OptionContract, SymbolDecision
from tradepilot.schemas.enums import AssetType, OptionType, OrderSide, OrderType, SymbolAction


def _snapshot(symbol="AAPL", price=100.0, spread_bps=3.0, stale=0.5, market_open=True):
    q = Quote(symbol=symbol, price=price, bid=price - 0.01, ask=price + 0.01,
              spread_bps=spread_bps, volume=1e6, timestamp=datetime.now(timezone.utc),
              stale_seconds=stale)
    return MarketSnapshot(
        id="s1", timestamp=datetime.now(timezone.utc), market_open=market_open,
        symbols={symbol: SymbolSnapshot(symbol=symbol, quote=q, indicators=Indicators())},
    )


def _buy(symbol="AAPL", qty=10, stop=98.0, asset=AssetType.STOCK, **kw):
    return SymbolDecision(symbol=symbol, asset_type=asset, action=SymbolAction.BUY,
                          side=OrderSide.LONG, order_type=OrderType.BRACKET, quantity=qty,
                          stop_loss=stop, take_profit=104.0, **kw)


@pytest.fixture
def engine():
    return RiskEngine(RiskSettings())


@pytest.fixture
def account():
    return Account(agent_id="openai")


@pytest.fixture
def gstate():
    return GlobalRiskState(simulation_running=True, kill_switch_active=False)


def test_position_size_min_of_risk_and_notional():
    s = RiskSettings()
    # risk_dollars = 10000*0.005 = 50; risk/share=2 -> 25 shares; notional cap = 2500/100=25
    assert position_size(10_000, 100, 98, s) == 25


def test_option_premium_risk():
    assert option_premium_risk(1.50, 2) == 300.0


def test_reject_when_simulation_not_running(engine, account):
    g = GlobalRiskState(simulation_running=False)
    rd = engine.evaluate(account=account, decision=_buy(), snapshot=_snapshot(),
                         agent_paused=False, global_state=g)
    assert not rd.approved and rd.rule == "simulation_not_running"
    assert len(rd.events) == 1


def test_reject_when_paused(engine, account, gstate):
    rd = engine.evaluate(account=account, decision=_buy(), snapshot=_snapshot(),
                         agent_paused=True, global_state=gstate)
    assert not rd.approved and rd.rule == "agent_paused"


def test_reject_kill_switch(engine, account):
    g = GlobalRiskState(simulation_running=True, kill_switch_active=True)
    rd = engine.evaluate(account=account, decision=_buy(), snapshot=_snapshot(),
                         agent_paused=False, global_state=g)
    assert not rd.approved and rd.rule == "kill_switch"


def test_reject_market_closed_for_new_position(engine, account, gstate):
    rd = engine.evaluate(account=account, decision=_buy(), snapshot=_snapshot(market_open=False),
                         agent_paused=False, global_state=gstate)
    assert not rd.approved and rd.rule == "market_closed"


def test_allow_close_when_market_closed(engine, gstate):
    acct = Account(agent_id="x")
    acct.positions["AAPL"] = Position(symbol="AAPL", quantity=10, avg_price=100,
                                      current_price=100, side=OrderSide.LONG)
    close = SymbolDecision(symbol="AAPL", asset_type=AssetType.STOCK, action=SymbolAction.CLOSE,
                           quantity=10)
    rd = engine.evaluate(account=acct, decision=close, snapshot=_snapshot(market_open=False),
                         agent_paused=False, global_state=gstate)
    assert rd.approved and rd.approved_quantity == 10


def test_reject_stale_data(engine, account, gstate):
    rd = engine.evaluate(account=account, decision=_buy(), snapshot=_snapshot(stale=30),
                         agent_paused=False, global_state=gstate)
    assert not rd.approved and rd.rule == "stale_data"


def test_reject_wide_spread(engine, account, gstate):
    rd = engine.evaluate(account=account, decision=_buy(), snapshot=_snapshot(spread_bps=20),
                         agent_paused=False, global_state=gstate)
    assert not rd.approved and rd.rule == "wide_spread"


def test_reject_zero_quantity(engine, account, gstate):
    rd = engine.evaluate(account=account, decision=_buy(qty=0), snapshot=_snapshot(),
                         agent_paused=False, global_state=gstate)
    assert not rd.approved and rd.rule == "invalid_quantity"


def test_reject_max_open_positions(engine, gstate):
    acct = Account(agent_id="x")
    for s in ("A", "B", "C"):
        acct.positions[s] = Position(symbol=s, quantity=1, avg_price=10, current_price=10)
    rd = engine.evaluate(account=acct, decision=_buy(symbol="NEW"),
                         snapshot=_snapshot("NEW"), agent_paused=False, global_state=gstate)
    assert not rd.approved and rd.rule == "max_open_positions"


def test_reject_invalid_long_stop(engine, account, gstate):
    rd = engine.evaluate(account=account, decision=_buy(stop=105.0),  # stop above entry
                         snapshot=_snapshot(price=100), agent_paused=False, global_state=gstate)
    assert not rd.approved and rd.rule == "invalid_stop"


def test_reject_naked_short_option(engine, account, gstate):
    sd = SymbolDecision(symbol="AAPL", asset_type=AssetType.OPTION, action=SymbolAction.SELL,
                        side=OrderSide.SHORT, quantity=1)
    rd = engine.evaluate(account=account, decision=sd, snapshot=_snapshot(),
                         agent_paused=False, global_state=gstate)
    assert not rd.approved and rd.rule == "no_naked_short_options"


def test_reject_option_without_data(engine, account, gstate):
    sd = SymbolDecision(symbol="AAPL", asset_type=AssetType.OPTION, action=SymbolAction.BUY,
                        side=OrderSide.LONG, quantity=1, option_contract=None)
    rd = engine.evaluate(account=account, decision=sd, snapshot=_snapshot(),
                         agent_paused=False, global_state=gstate)
    assert not rd.approved and rd.rule == "option_data_unavailable"


def test_reject_single_option_risk_over_5pct(engine, account, gstate):
    # mid 6.0 * 100 = 600 premium > 5% of 10000 = 500
    oc = OptionContract(underlying="AAPL", type=OptionType.CALL, strike=100,
                        expiration=date(2026, 6, 19), dte=21, mid=6.0)
    sd = SymbolDecision(symbol="AAPL", asset_type=AssetType.OPTION, action=SymbolAction.BUY,
                        side=OrderSide.LONG, quantity=1, option_contract=oc)
    rd = engine.evaluate(account=account, decision=sd, snapshot=_snapshot(),
                         agent_paused=False, global_state=gstate)
    assert not rd.approved and rd.rule == "single_option_risk"


def test_accept_small_option(engine, account, gstate):
    oc = OptionContract(underlying="AAPL", type=OptionType.CALL, strike=100,
                        expiration=date(2026, 6, 19), dte=21, mid=2.0)  # 200 < 500
    sd = SymbolDecision(symbol="AAPL", asset_type=AssetType.OPTION, action=SymbolAction.BUY,
                        side=OrderSide.LONG, quantity=1, option_contract=oc)
    rd = engine.evaluate(account=account, decision=sd, snapshot=_snapshot(),
                         agent_paused=False, global_state=gstate)
    assert rd.approved and rd.approved_quantity == 1


def test_option_total_exposure_limit(engine, gstate):
    acct = Account(agent_id="x")
    # existing option position worth 2800 (premium already paid from cash -> equity stays 10k)
    acct.cash = 7_200.0
    acct.positions["SPY"] = Position(symbol="SPY", asset_type=AssetType.OPTION, quantity=10,
                                     avg_price=2.8, current_price=2.8, multiplier=100.0)
    oc = OptionContract(underlying="AAPL", type=OptionType.PUT, strike=100,
                        expiration=date(2026, 6, 19), dte=21, mid=4.5)  # 450 -> 28%+4.5%>30%
    sd = SymbolDecision(symbol="AAPL", asset_type=AssetType.OPTION, action=SymbolAction.BUY,
                        side=OrderSide.LONG, quantity=1, option_contract=oc)
    rd = engine.evaluate(account=acct, decision=sd, snapshot=_snapshot(),
                         agent_paused=False, global_state=gstate)
    assert not rd.approved and rd.rule == "option_exposure_limit"


def test_accepts_valid_stock_buy(engine, account, gstate):
    rd = engine.evaluate(account=account, decision=_buy(), snapshot=_snapshot(price=100),
                         agent_paused=False, global_state=gstate)
    assert rd.approved and rd.approved_quantity > 0
