"use client";

import Link from "next/link";
import type { Retainer } from "@/lib/types";
import { formatAmount } from "@/lib/format";
import { TOKEN_SYMBOL } from "@/lib/config";
import { StateBadge } from "./StateBadge";
import { Address } from "./Address";
import { nextAction } from "@/lib/next-action";
import { getProfile } from "@/lib/profiles";

interface Props {
  retainer: Retainer;
  viewer: string | null;
  blockHeight: number;
}

// Shows a party as their profile name (if they have one) with the address
// underneath — so "the person I hired" reads as a name, not a hex string.
function Party({
  who,
  viewer,
  label,
}: {
  who: string;
  viewer: string | null;
  label: string;
}) {
  const profile = getProfile(who);
  return (
    <div className="flex items-center gap-2">
      {profile ? (
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-fg">
            {profile.name}
            {viewer === who && <span className="ml-1 text-xs text-accent">(You)</span>}
          </div>
          <div className="flex items-center gap-1 text-xs text-faint">
            <span>{label}</span>
            <span>·</span>
            <Address address={who} viewer={viewer} showCopy={false} link={false} size="sm" />
          </div>
        </div>
      ) : (
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="text-faint">{label}</span>
          <Address address={who} viewer={viewer} showCopy={false} link={false} size="sm" />
        </span>
      )}
    </div>
  );
}

// A compact, clickable summary. The whole card links to the detail page where
// the timeline + the one action live. The card's job is just: what is this, and
// does it need MY attention right now.
export function RetainerCard({ retainer: r, viewer, blockHeight }: Props) {
  const na = nextAction(r, viewer, blockHeight);
  const needsMe = na.primary && na.role !== "observer";

  const amountColor =
    r.state === "paid" || r.state === "resolved"
      ? "text-accent"
      : r.state === "reclaimed"
        ? "text-muted"
        : "text-gold";

  return (
    <Link
      href={`/retainer/${r.id}`}
      className={`custos-card block p-5 no-underline transition-transform hover:-translate-y-0.5 ${
        needsMe ? "custos-card--secured" : ""
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 text-xs text-faint">Retainer #{r.id}</div>
          {viewer === r.client ? (
            <Party who={r.freelancer} viewer={viewer} label="Freelancer" />
          ) : viewer === r.freelancer ? (
            <Party who={r.client} viewer={viewer} label="Client" />
          ) : (
            <div className="space-y-1">
              <Party who={r.client} viewer={viewer} label="Client" />
              <Party who={r.freelancer} viewer={viewer} label="Freelancer" />
            </div>
          )}
        </div>
        <StateBadge state={r.state} />
      </div>

      <div className={`text-2xl font-semibold tracking-tight ${amountColor}`}>
        {formatAmount(r.lockAmount)}{" "}
        <span className="text-sm font-normal text-muted">{TOKEN_SYMBOL}</span>
      </div>

      {/* the "what's next" hint — always tells you the situation */}
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        {needsMe && <span className="h-2 w-2 shrink-0 rounded-full bg-accent animate-vault-pulse" />}
        <span className={`text-sm ${needsMe ? "text-fg" : "text-muted"}`}>
          {na.headline}
        </span>
        <span className="ml-auto shrink-0 text-xs text-faint">details →</span>
      </div>
    </Link>
  );
}
