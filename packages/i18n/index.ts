/**
 * Shared i18n dictionaries (zh-CN default, en-US toggle). No hardcoded UI strings in
 * components — everything goes through these dictionaries. Chinese copy is hand-written.
 */
export type Locale = "zh-CN" | "en-US";

export const LOCALES: Locale[] = ["zh-CN", "en-US"];

export const dictionaries = {
  "zh-CN": {
    app: { name: "TradePilot Arena", tagline: "AI 交易 Agent 模拟盘竞技场" },
    mode: { simulation: "模拟盘", paper: "模拟交易", live: "实盘交易" },
    sim: { running: "运行中", paused: "已暂停", stopped: "已停止", start: "开始模拟盘", pause: "暂停模拟盘", reset: "重置模拟盘" },
    market: { open: "开盘", closed: "休市", premarket: "盘前", afterhours: "盘后", regime: "市场状态", overview: "市场概览" },
    regime: { risk_on: "风险偏好", risk_off: "风险规避", mixed: "多空交织", uncertain: "方向不明" },
    nav: {
      dashboard: "模拟盘总览", agents: "Agent 列表", market: "市场图表", positions: "模拟持仓",
      orders: "模拟订单", trades: "交易历史", decisions: "决策日志", risk: "风险与紧急停止",
      backtests: "回测", reports: "模拟盘报告", settings: "设置",
    },
    hero: {
      totalEquity: "四个 Agent 总虚拟资产", bestAgent: "当前最佳 Agent", worstDrawdown: "最大回撤 Agent",
      todayPnl: "今日总盈亏", activeAgents: "活跃 Agent", decisionsToday: "今日决策次数",
      riskRejections: "今日风控拒单",
    },
    leaderboard: {
      title: "Agent 排行榜", rank: "排名", name: "Agent", model: "模型", equity: "当前权益",
      totalReturn: "总收益率", todayPnl: "今日盈亏", maxDrawdown: "最大回撤", winRate: "胜率",
      profitFactor: "盈亏比", trades: "交易数", optionExposure: "期权敞口", violations: "风险违规",
      status: "状态", score: "综合评分",
    },
    metric: { currentEquity: "当前权益", dailyPnl: "今日盈亏", maxDrawdown: "最大回撤", optionExposure: "期权敞口", positions: "持仓", orders: "订单" },
    equityChart: { title: "权益曲线对比", today: "今日", week: "1周", month: "1月", all: "全部" },
    feed: { title: "实时决策流", empty: "暂无决策，点击“立即运行决策”开始", confidence: "信心", riskResult: "风控结果" },
    risk: {
      overview: "风险概览", killSwitch: "紧急停止", events: "风险事件", pausedAgents: "已暂停 Agent",
      rejectedOrders: "被拒订单", providerHealth: "模型服务状态", apiCost: "API 成本估算", monthlyBudget: "月度预算",
      confirmKill: "确认触发全局紧急停止？将暂停所有 Agent 并取消所有模拟挂单。",
    },
    positions: { title: "当前主要持仓", symbol: "标的", qty: "数量", avg: "均价", price: "现价", upnl: "未实现盈亏", stop: "止损", target: "止盈", empty: "暂无持仓" },
    actions: { runNow: "立即运行决策", runAll: "运行所有 Agent", pauseAgent: "暂停 Agent", resumeAgent: "恢复 Agent", exportLogs: "导出日志", settings: "设置", confirm: "确认", cancel: "取消" },
    settings: {
      title: "设置", providers: "AI Provider 与 API 密钥", apiKeys: "API 密钥", marketData: "市场数据",
      advanced: "高级设置", modelSettings: "模型设置", testConnection: "测试连接", refreshModels: "刷新模型",
      enable: "启用", disable: "禁用", save: "保存", delete: "删除", maskedHint: "密钥仅显示掩码，明文不会返回浏览器",
      watchlist: "自选股", language: "语言", theme: "主题",
    },
    providerStatus: { connected: "已连接", missing_key: "缺少密钥", invalid_key: "密钥无效", rate_limited: "限流", degraded: "服务降级", disabled: "已禁用" },
    common: { loading: "加载中…", error: "出错了", retry: "重试", empty: "暂无数据", localTime: "本地时间", etTime: "美东时间", disclaimer: "本软件为模拟盘，不构成投资建议，不承诺盈利。" },
    theme: { light: "浅色", dark: "深色", system: "跟随系统" },
  },
  "en-US": {
    app: { name: "TradePilot Arena", tagline: "AI Trading-Agent Paper-Trading Arena" },
    mode: { simulation: "Simulation", paper: "Paper Trading", live: "Live Trading" },
    sim: { running: "Running", paused: "Paused", stopped: "Stopped", start: "Start Simulation", pause: "Pause Simulation", reset: "Reset Simulation" },
    market: { open: "Open", closed: "Closed", premarket: "Pre-market", afterhours: "After-hours", regime: "Market Regime", overview: "Market Overview" },
    regime: { risk_on: "Risk On", risk_off: "Risk Off", mixed: "Mixed", uncertain: "Uncertain" },
    nav: {
      dashboard: "Dashboard", agents: "Agents", market: "Market", positions: "Positions",
      orders: "Orders", trades: "Trades", decisions: "Decision Log", risk: "Risk & Kill Switch",
      backtests: "Backtests", reports: "Reports", settings: "Settings",
    },
    hero: {
      totalEquity: "Total Equity (4 Agents)", bestAgent: "Best Agent", worstDrawdown: "Max Drawdown Agent",
      todayPnl: "Today's PnL", activeAgents: "Active Agents", decisionsToday: "Decisions Today",
      riskRejections: "Risk Rejections Today",
    },
    leaderboard: {
      title: "Agent Leaderboard", rank: "Rank", name: "Agent", model: "Model", equity: "Equity",
      totalReturn: "Total Return", todayPnl: "Today PnL", maxDrawdown: "Max DD", winRate: "Win Rate",
      profitFactor: "Profit Factor", trades: "Trades", optionExposure: "Opt. Exposure", violations: "Risk Violations",
      status: "Status", score: "Score",
    },
    metric: { currentEquity: "Current Equity", dailyPnl: "Daily PnL", maxDrawdown: "Max Drawdown", optionExposure: "Option Exposure", positions: "Positions", orders: "Orders" },
    equityChart: { title: "Equity Curves", today: "Today", week: "1W", month: "1M", all: "All" },
    feed: { title: "Live Decision Feed", empty: "No decisions yet — click Run Decision Now", confidence: "Confidence", riskResult: "Risk Result" },
    risk: {
      overview: "Risk Overview", killSwitch: "Kill Switch", events: "Risk Events", pausedAgents: "Paused Agents",
      rejectedOrders: "Rejected Orders", providerHealth: "Provider Health", apiCost: "API Cost", monthlyBudget: "Monthly Budget",
      confirmKill: "Trigger the global kill switch? This pauses all agents and cancels all simulated orders.",
    },
    positions: { title: "Top Positions", symbol: "Symbol", qty: "Qty", avg: "Avg", price: "Price", upnl: "Unrealized PnL", stop: "Stop", target: "Target", empty: "No positions" },
    actions: { runNow: "Run Decision Now", runAll: "Run All Agents", pauseAgent: "Pause Agent", resumeAgent: "Resume Agent", exportLogs: "Export Logs", settings: "Settings", confirm: "Confirm", cancel: "Cancel" },
    settings: {
      title: "Settings", providers: "AI Providers & API Keys", apiKeys: "API Keys", marketData: "Market Data",
      advanced: "Advanced", modelSettings: "Model Settings", testConnection: "Test Connection", refreshModels: "Refresh Models",
      enable: "Enable", disable: "Disable", save: "Save", delete: "Delete", maskedHint: "Only a masked key is shown; plaintext never returns to the browser",
      watchlist: "Watchlist", language: "Language", theme: "Theme",
    },
    providerStatus: { connected: "Connected", missing_key: "Missing Key", invalid_key: "Invalid Key", rate_limited: "Rate Limited", degraded: "Degraded", disabled: "Disabled" },
    common: { loading: "Loading…", error: "Something went wrong", retry: "Retry", empty: "No data", localTime: "Local", etTime: "ET", disclaimer: "Paper trading only. Not investment advice. No profit promised." },
    theme: { light: "Light", dark: "Dark", system: "System" },
  },
} as const;

export type Dictionary = (typeof dictionaries)["zh-CN"];
