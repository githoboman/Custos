"use client";

import { explorerTx } from "@/lib/config";

export interface TxNotice {
  id: number;
  label: string;
  txId: string;
}

export function TxToasts({
  notices,
  onDismiss,
}: {
  notices: TxNotice[];
  onDismiss: (id: number) => void;
}) {
  if (notices.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      {notices.map((n) => (
        <div
          key={n.id}
          className="custos-card custos-card--raised flex items-center gap-3 p-3 pr-4"
          style={{ animation: "shield-in 200ms var(--custos-ease)" }}
        >
          <div className="h-2 w-2 rounded-full bg-accent" />
          <div className="text-sm">
            <div className="font-medium">
              {n.label} <span className="text-muted">submitted</span>
            </div>
            <a
              href={explorerTx(n.txId)}
              target="_blank"
              rel="noreferrer"
              className="tabular text-xs text-accent hover:underline"
            >
              {n.txId.slice(0, 10)}… ↗
            </a>
          </div>
          <button
            className="ml-2 text-faint hover:text-fg"
            onClick={() => onDismiss(n.id)}
            aria-label="dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
