"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useRetainers } from "@/hooks/useRetainers";
import { Header } from "@/components/Header";
import { RetainerCard } from "@/components/RetainerCard";
import { NeedsYou } from "@/components/NeedsYou";
import { ProfileForm } from "@/components/ProfileForm";
import { TxToasts } from "@/components/TxToast";
import { formatAmount } from "@/lib/format";
import { getProfile } from "@/lib/profiles";
import { Address } from "@/components/Address";
import { TOKEN_SYMBOL } from "@/lib/config";

export default function FreelancerSpace() {
  const { address, isConnected } = useWallet();
  const { retainers, block, balance, loading, notices, dismiss } =
    useRetainers(address);
  const [showProfile, setShowProfile] = useState(false);
  const hasProfile = address ? !!getProfile(address) : false;

  const mine = retainers.filter((r) => r.freelancer === address);
  const earned = mine
    .filter((r) => r.state === "paid" || r.state === "resolved")
    .reduce((sum, r) => sum + r.lockAmount, 0n);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <Header />

      <div className="mb-8">
        <div className="text-xs uppercase tracking-wider text-faint">Freelancer</div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-fg">
          Work you&apos;ve been hired for
        </h1>
        <p className="mt-1 text-muted">
          Mark work delivered, then get paid when the client approves.
        </p>
      </div>

      {isConnected ? (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Your balance" value={`${balance === null ? "…" : formatAmount(balance)} ${TOKEN_SYMBOL}`} />
          <Stat label="Active engagements" value={String(mine.filter((r) => r.state === "active" || r.state === "delivered" || r.state === "disputed").length)} />
          <Stat label="Released to you" value={`${formatAmount(earned)} ${TOKEN_SYMBOL}`} accent />
        </div>
      ) : (
        <div className="custos-card mb-8 p-5 text-sm text-muted">
          Connect the wallet that was hired to see your work and get paid.
        </div>
      )}

      {isConnected && address && (
        <div className="mb-8">
          {showProfile ? (
            <ProfileForm address={address} onSaved={() => setShowProfile(false)} />
          ) : (
            <div className="custos-card flex items-center justify-between p-4">
              <div className="text-sm">
                <span className="text-fg">
                  {hasProfile ? "Your profile is live in the directory." : "Create a profile so clients can find you."}
                </span>
                <span className="ml-1 text-faint">Clients browse profiles to hire.</span>
              </div>
              <button className="custos-btn custos-btn--secondary" onClick={() => setShowProfile(true)}>
                {hasProfile ? "Edit profile" : "Create profile"}
              </button>
            </div>
          )}
        </div>
      )}

      <NeedsYou retainers={mine} viewer={address} block={block} />

      <h2 className="mb-4 mt-8 text-sm font-medium text-muted">
        Your engagements {mine.length > 0 && `(${mine.length})`}
      </h2>
      {loading ? (
        <div className="custos-card p-8 text-center text-muted">Loading…</div>
      ) : mine.length === 0 ? (
        <div className="custos-card p-10 text-center text-muted">
          <p>No one has hired this wallet yet.</p>
          <p className="mt-1 text-sm text-faint">
            When a client hires you at{" "}
            {address ? (
              <span className="inline-flex align-middle">
                <Address address={address} viewer={address} showCopy link={false} size="sm" />
              </span>
            ) : (
              "your address"
            )}
            , the retainer shows up here.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {mine.map((r) => (
            <RetainerCard key={r.id} retainer={r} viewer={address} blockHeight={block} />
          ))}
        </div>
      )}

      <TxToasts notices={notices} onDismiss={dismiss} />
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="custos-card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`tabular mt-1 text-xl font-semibold ${accent ? "text-gold" : "text-fg"}`}>
        {value}
      </div>
    </div>
  );
}
