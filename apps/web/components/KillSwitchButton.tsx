"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Power } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { ConfirmDangerDialog } from "@/components/ConfirmDangerDialog";

export function KillSwitchButton({ active }: { active: boolean }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          active
            ? "inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-950 px-3 text-xs font-semibold text-red-300 ring-1 ring-red-500/60"
            : "inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 text-xs font-semibold text-rose-500 hover:bg-rose-500/20"
        }
      >
        <Power size={15} />
        {t("risk.killSwitch")}
      </button>
      <ConfirmDangerDialog
        open={open}
        title={t("risk.killSwitch")}
        message={t("risk.confirmKill")}
        confirmLabel={t("actions.confirm")}
        cancelLabel={t("actions.cancel")}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          await api.killSwitch();
          await qc.invalidateQueries();
          setOpen(false);
        }}
      />
    </>
  );
}
