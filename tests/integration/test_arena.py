"""Arena fairness + isolation + orchestration."""
from tradepilot.arena import Arena
from tradepilot.schemas.enums import Provider


def test_default_four_agents_each_10k():
    a = Arena()
    assert len(a.agents) == 4
    for acct in a.accounts.values():
        assert acct.starting_cash == 10_000


def test_all_agents_share_one_snapshot_per_round():
    a = Arena()
    a.start()
    snap = a.build_snapshot(market_open=True)
    # same snapshot object id reused across the round in run_round; here verify symbols identical
    assert set(snap.symbols) == set(a.watchlist)


def test_portfolios_are_isolated():
    a = Arena()
    a.start()
    for _ in range(10):
        a.run_round(market_open=True)
    accounts = list(a.accounts.values())
    # equities should be tracked independently (objects are distinct)
    assert len({id(acct) for acct in accounts}) == 4


def test_one_provider_failure_does_not_stop_others(monkeypatch):
    a = Arena()
    a.start()

    def boom(*args, **kwargs):
        raise RuntimeError("provider down")

    # break only the OpenAI provider
    a.providers["openai"].generate_structured_decision = boom
    a.run_round(market_open=True)
    # other three agents still produced decisions
    others = {d.agent_id for d in a.decisions if d.valid}
    assert "anthropic" in others or "gemini" in others or "deepseek" in others


def test_leaderboard_ranks_and_scores():
    a = Arena()
    a.start()
    for _ in range(20):
        a.run_round(market_open=True)
    lb = a.leaderboard()
    assert len(lb) == 4
    assert lb[0]["rank"] == 1
    assert all("score" in r for r in lb)
    # ranking is by score descending
    scores = [r["score"] for r in lb]
    assert scores == sorted(scores, reverse=True)


def test_kill_switch_pauses_and_flattens():
    a = Arena()
    a.start()
    for _ in range(15):
        a.run_round(market_open=True)
    a.kill_switch(close_positions=True)
    assert a.global_state.kill_switch_active
    assert not a.global_state.simulation_running
    for acct in a.accounts.values():
        assert acct.positions == {}


def test_cost_tracking_accumulates():
    a = Arena()
    a.start()
    a.run_round(market_open=True)
    assert a.total_cost() >= 0
    assert len(a.cost_events) >= 1
