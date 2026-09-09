"use client";

import Link from "next/link";
import type { Retainer } from "@/lib/types";
import { nextAction } from "@/lib/next-action";

export function NeedsYou({
  retainers,
  viewer,
  block,
}: {
  retainers: Retainer[];
  viewer: string | null;
  block: number;
}) {
  if (!viewer) return null;
  const needMe = retainers.filter((r) => {
    const na = nextAction(r, viewer, block);
    return na.primary && na.role !== "observer";
  });
  if (needMe.length === 0) return null;

  return (
    <div className="custos-card custos-card--secured p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gold">
        <span className="h-2 w-2 rounded-full bg-gold animate-vault-pulse" />
        {needMe.length} {needMe.length === 1 ? "action needs" : "actions need"} you
      </div>
      <div className="space-y-2">
        {needMe.slice(0, 4).map((r) => {
          const na = nextAction(r, viewer, block);
          return (
            <Link
              key={r.id.toString()}
              href={`/retainer/${r.id}`}
              className="flex items-center justify-between rounded border border-line bg-surface px-4 py-2.5 no-underline transition-colors hover:border-line-strong"
            >
              <span className="text-sm text-fg">
                <span className="tabular text-muted">#{r.id.toString()}</span> — {na.headline}
              </span>
              <span className="shrink-0 text-sm font-medium text-accent">
                {na.label || "view"} →
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
