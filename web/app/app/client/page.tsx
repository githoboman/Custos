"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useRetainers } from "@/hooks/useRetainers";
import { Header } from "@/components/Header";
import { RetainerCard } from "@/components/RetainerCard";
import { NeedsYou } from "@/components/NeedsYou";
import { TxToasts } from "@/components/TxToast";
import { mintTestTokens } from "@/lib/custos-write";
import { formatAmount, parseAmount } from "@/lib/format";
import { TOKEN_SYMBOL } from "@/lib/config";

export default function ClientSpace() {
  const { address, isConnected } = useWallet();
  const { retainers, block, balance, loading, notices, pushNotice, dismiss, refresh, refreshBalance } =
    useRetainers();

  const mine = retainers.filter((r) => r.client === address);

  useEffect(() => {
    if (address) refreshBalance(address);
  }, [address, refreshBalance]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <Header />

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-faint">Client</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">
            People you&apos;re hiring
          </h1>
          <p className="mt-1 text-muted">
            Fund the escrow, track delivery, approve &amp; release payment.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/directory" className="custos-btn custos-btn--secondary no-underline">
            Browse freelancers
          </Link>
          <Link href="/hire" className="custos-btn custos-btn--primary no-underline">
            + Hire a freelancer
          </Link>
        </div>
      </div>

      {isConnected ? (
        balance !== null && balance === 0n ? (
          <div className="custos-card custos-card--secured mb-8 p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-accent">
              Step 1 · Get test funds
            </div>
            <p className="mt-1 text-sm text-muted">
              You have 0 {TOKEN_SYMBOL}. Grab free test tokens so you can hire
              someone (this is a testnet demo token, one click).
            </p>
            <button
              className="custos-btn custos-btn--primary mt-3"
              onClick={() =>
                address &&
                mintTestTokens(parseAmount("100"), address, (t) =>
                  pushNotice(`Got 100 ${TOKEN_SYMBOL}`, t)
                )
              }
            >
              Get 100 {TOKEN_SYMBOL} test tokens
            </button>
          </div>
        ) : (
          <div className="custos-card mb-8 flex flex-wrap items-center justify-between gap-3 p-4">
            <span className="text-sm text-muted">
              Your balance:{" "}
              <span className="tabular font-medium text-fg">
                {balance === null ? "…" : formatAmount(balance)} {TOKEN_SYMBOL}
              </span>
            </span>
            <button
              className="custos-btn custos-btn--secondary"
              onClick={() =>
                address &&
                mintTestTokens(parseAmount("100"), address, (t) =>
                  pushNotice(`Got 100 ${TOKEN_SYMBOL}`, t)
                )
              }
              title="Free test tokens for the demo"
            >
              + Get 100 test tokens
            </button>
          </div>
        )
      ) : (
        <div className="custos-card mb-8 p-5 text-sm text-muted">
          Connect a wallet to hire and manage retainers.
        </div>
      )}

      <NeedsYou retainers={mine} viewer={address} block={block} />

      <div className="mb-4 mt-8 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted">
          People you&apos;ve hired {mine.length > 0 && `(${mine.length})`}
        </h2>
        <button className="text-xs text-accent hover:underline" onClick={refresh}>
          Refresh
        </button>
      </div>
      <p className="mb-4 -mt-2 text-xs text-faint">
        Just hired someone? The retainer appears here once the transaction
        confirms (about a minute) — hit Refresh if you don&apos;t see it yet.
      </p>
      {loading ? (
        <div className="custos-card p-8 text-center text-muted">Loading…</div>
      ) : mine.length === 0 ? (
        <div className="custos-card p-10 text-center">
          <p className="text-muted">You haven&apos;t hired anyone yet.</p>
          <Link href="/hire" className="custos-btn custos-btn--primary mt-4 inline-flex no-underline">
            Hire your first freelancer
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {mine.map((r) => (
            <RetainerCard key={r.id.toString()} retainer={r} viewer={address} blockHeight={block} />
          ))}
        </div>
      )}

      <TxToasts notices={notices} onDismiss={dismiss} />
    </main>
  );
}
