"use client";
import { AlertTriangle } from "lucide-react";

export function ConfirmDangerDialog({
  open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel,
}: {
  open: boolean; title: string; message: string; confirmLabel: string; cancelLabel: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/15 text-rose-500">
            <AlertTriangle size={20} />
          </div>
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <p className="mt-3 text-sm text-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-2">{cancelLabel}</button>
          <button onClick={onConfirm} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
