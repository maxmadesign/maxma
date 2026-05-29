/** Typed API client. The browser talks only to this backend — never to brokers or LLM APIs. */
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json") ? res.json() : res.text()) as Promise<T>;
}

export const api = {
  health: () => req<any>("/health"),
  simulationStatus: () => req<any>("/simulation/status"),
  metrics: () => req<any>("/simulation/metrics"),
  leaderboard: () => req<any[]>("/simulation/leaderboard"),
  equityCurves: () => req<Record<string, any[]>>("/simulation/equity-curves"),
  start: () => req("/simulation/start", { method: "POST" }),
  pause: () => req("/simulation/pause", { method: "POST" }),
  reset: () => req("/simulation/reset", { method: "POST" }),
  agents: () => req<any[]>("/agents"),
  agent: (id: string) => req<any>(`/agents/${id}`),
  runAgentNow: (id: string) => req(`/agents/${id}/run-decision-now`, { method: "POST" }),
  pauseAgent: (id: string) => req(`/agents/${id}/pause`, { method: "POST" }),
  resumeAgent: (id: string) => req(`/agents/${id}/resume`, { method: "POST" }),
  patchAgent: (id: string, body: any) => req(`/agents/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  decisions: (params = "") => req<any[]>(`/decisions${params}`),
  agentDecisions: (id: string) => req<any[]>(`/agents/${id}/decisions`),
  riskStatus: () => req<any>("/risk/status"),
  riskEvents: () => req<any[]>("/risk/events"),
  killSwitch: () => req("/risk/kill-switch", { method: "POST" }),
  clearKill: (confirmation: string) => req("/risk/clear-kill-switch", { method: "POST", body: JSON.stringify({ confirmation }) }),
  providers: () => req<any[]>("/providers"),
  saveKey: (p: string, api_key: string) => req(`/providers/${p}/key`, { method: "POST", body: JSON.stringify({ api_key }) }),
  deleteKey: (p: string) => req(`/providers/${p}/key`, { method: "DELETE" }),
  testProvider: (p: string) => req(`/providers/${p}/test`, { method: "POST" }),
  refreshModels: (p: string) => req(`/providers/${p}/refresh-models`, { method: "POST" }),
  marketSnapshot: () => req<any>("/market/snapshot"),
  bars: (symbol: string, tf = "5m") => req<any[]>(`/market/bars/${symbol}?timeframe=${tf}`),
  cost: () => req<any>("/settings/cost"),
  report: (lang = "zh-CN") => req<any>(`/reports/simulation?lang=${lang}`),
  positions: () => req<any[]>("/positions"),
  trades: () => req<any[]>("/trades"),
};

export { BASE as API_BASE };
