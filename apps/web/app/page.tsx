import { HeroMetrics } from "@/components/HeroMetrics";
import { AgentLeaderboard } from "@/components/AgentLeaderboard";
import { EquityCurveChart } from "@/components/EquityCurveChart";
import { AgentCardGrid } from "@/components/AgentCardGrid";
import { DecisionFeed } from "@/components/DecisionFeed";
import { MarketOverview } from "@/components/MarketOverview";
import { RiskOverview } from "@/components/RiskOverview";
import { PositionsTable } from "@/components/PositionsTable";

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      {/* 1. Hero overview */}
      <HeroMetrics />

      {/* 2. Leaderboard */}
      <AgentLeaderboard />

      {/* 3. Equity curves + live decision feed (bento) */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2"><EquityCurveChart /></div>
        <div><DecisionFeed /></div>
      </div>

      {/* 4. Agent cards */}
      <AgentCardGrid />

      {/* 5. Market + risk + positions */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <MarketOverview />
        <RiskOverview />
        <div className="lg:col-span-1"><PositionsTable /></div>
      </div>
    </div>
  );
}
