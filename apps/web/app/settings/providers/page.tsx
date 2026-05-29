"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { ProviderSettingsCard } from "@/components/ProviderSettingsCard";
import { Skeleton } from "@/components/ui/Card";

export default function ProvidersSettingsPage() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["providers"], queryFn: api.providers });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">{t("settings.providers")}</h1>
        <p className="text-sm text-muted">
          {t("settings.maskedHint")}。Cloud API key 视为 Anthropic Claude key。
        </p>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64" />)}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data?.map((p) => <ProviderSettingsCard key={p.provider} provider={p} />)}
        </div>
      )}
    </div>
  );
}
