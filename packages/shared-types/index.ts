/** Shared TypeScript types mirroring the backend Pydantic schemas
 * (apps/api/tradepilot/schemas). Keep in sync with the Python enums. */

export type Provider = "openai" | "anthropic" | "gemini" | "deepseek";
export type MarketRegime = "risk_on" | "risk_off" | "mixed" | "uncertain";
export type OverallAction = "trade" | "hold" | "reduce_risk" | "close_positions";
export type SymbolAction = "buy" | "sell" | "hold" | "reduce" | "close";
export type AssetType = "stock" | "etf" | "option" | "cash";
export type OptionType = "call" | "put";
export type OrderSide = "long" | "short" | "none";
export type OrderType = "market" | "limit" | "stop" | "bracket";
export type OrderStatus =
  | "pending" | "submitted" | "partially_filled" | "filled"
  | "cancelled" | "rejected" | "expired";
export type RiskStatus = "safe" | "warning" | "danger" | "paused" | "kill_switch";
export type AgentStatus =
  | "thinking" | "idle" | "waiting_for_market" | "trading" | "paused" | "error" | "disabled";

export interface ChecklistItem {
  label: string;
  passed: boolean;
  value: string | number | null;
  explanation: string;
}

export interface LeaderboardRow {
  rank: number;
  agent_id: string;
  name: string;
  provider: Provider;
  model: string;
  status: AgentStatus;
  equity: number;
  total_return_pct: number;
  daily_pnl: number;
  max_drawdown_pct: number;
  win_rate: number;
  profit_factor: number | null;
  total_trades: number;
  option_exposure_pct: number;
  risk_violations: number;
  score: number;
}
