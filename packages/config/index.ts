/** Shared front-end configuration constants. */

export const DEFAULT_WATCHLIST = [
  "SPY", "QQQ", "IWM", "AAPL", "MSFT", "NVDA", "AMD",
  "META", "AMZN", "TSLA", "GOOGL", "NFLX", "AVGO",
];

export const TIMEFRAMES = ["1m", "5m", "15m", "1h", "1d"] as const;

export const RISK_DEFAULTS = {
  starting_equity: 10_000,
  risk_per_trade_pct: 0.005,
  max_daily_loss_pct: 0.015,
  max_weekly_loss_pct: 0.04,
  max_position_notional_pct: 0.25,
  max_open_positions: 3,
  max_trades_per_day: 8,
  max_option_exposure_pct: 0.30,
  max_single_option_trade_risk_pct: 0.05,
  live_trading_enabled: false,
};

export const REFETCH_INTERVAL_MS = 5000;
