"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AgentCard } from "@/components/AgentCard";
import { Skeleton } from "@/components/ui/Card";

export function AgentCardGrid() {
  const { data, isLoading } = useQuery({ queryKey: ["agents"], queryFn: api.agents });
  if (isLoading) return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64" />)}</div>;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {data?.map((a) => <AgentCard key={a.id} agent={a} />)}
    </div>
  );
}
