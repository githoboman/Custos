"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { Header } from "@/components/Header";
import { Timeline } from "@/components/Timeline";
import { StateBadge } from "@/components/StateBadge";
import { Address } from "@/components/Address";
import { DisputePanel } from "@/components/DisputePanel";
import { TxToasts, type TxNotice } from "@/components/TxToast";
import { getRetainer, getBlockHeight } from "@/lib/custos-read";
import { nextAction, type ActionKind } from "@/lib/next-action";
import { formatAmount } from "@/lib/format";
import { CUSTOS_ADDRESS, TOKEN_SYMBOL, explorerAddress } from "@/lib/config";
import * as write from "@/lib/custos-write";
import type { Retainer } from "@/lib/types";

const RUN: Record<
  Exclude<ActionKind, "none" | "resolve-dispute">,
  (id: bigint, cb: (t: string) => void) => void
> = {
  "mark-delivered": (id, cb) => write.markDelivered(Number(id), cb),
  "approve-and-release": (id, cb) => write.approveAndRelease(Number(id), cb),
  "auto-release": (id, cb) => write.autoRelease(Number(id), cb),
  dispute: (id, cb) => write.dispute(Number(id), cb),
  "reclaim-abandoned": (id, cb) => write.reclaimAbandoned(Number(id), cb),
};

export default function RetainerDetail() {
  const params = useParams();
  const router = useRouter();
  const id = BigInt(params.id as string);
  const { address } = useWallet();

  const [r, setR] = useState<Retainer | null>(null);
  const [block, setBlock] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notices, setNotices] = useState<TxNotice[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ret, bh] = await Promise.all([getRetainer(Number(id)), getBlockHeight()]);
      setR(ret);
      setBlock(bh);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const pushNotice = (label: string, txId: string) => {
    setNotices((n) => [...n, { id: Date.now(), label, txId }]);
    setTimeout(load, 8000);
  };

  const act = (kind: ActionKind, label: string) => {
    if (kind === "none" || kind === "resolve-dispute") return;
    setBusy(true);
    RUN[kind](id, (txId) => {
      pushNotice(label, txId);
      setBusy(false);
    });
    setTimeout(() => setBusy(false), 500);
  };

  const na = r ? nextAction(r, address, block) : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Header />

      <button
        onClick={() => router.back()}
        className="mb-6 inline-block text-sm text-muted hover:text-fg"
      >
        ← Back
      </button>

      {loading ? (
        <div className="custos-card p-8 text-center text-muted">Loading…</div>
      ) : !r ? (
        <div className="custos-card p-8 text-center text-muted">
          Retainer #{id.toString()} not found.
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">Retainer #{r.id.toString()}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <Address address={r.client} viewer={address} label="Client" showCopy={false} />
                <span className="text-faint">hired</span>
                <Address address={r.freelancer} viewer={address} label="Freelancer" showCopy={false} />
              </div>
            </div>
            <StateBadge state={r.state} />
          </div>

          <div className="custos-card p-6 mb-6">
            <Timeline state={r.state} />
          </div>

          {na && (
            <div
              className={`mb-6 p-6 ${
                na.primary ? "custos-card custos-card--secured" : "custos-card"
              }`}
            >
              <div className="mb-1 text-xs uppercase tracking-wider text-faint">
                {na.role === "observer" ? "Status" : "Your next step"}
              </div>
              <div className="text-lg font-semibold">{na.headline}</div>
              <p className="mt-2 text-sm text-muted">{na.detail}</p>

              {na.primary && na.kind !== "none" && na.kind !== "resolve-dispute" && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    className="custos-btn custos-btn--primary"
                    disabled={busy}
                    onClick={() => act(na.kind, na.label)}
                  >
                    {busy ? "Confirming…" : na.label}
                  </button>
                  {na.kind === "approve-and-release" && (
                    <button
                      className="custos-btn custos-btn--danger"
                      disabled={busy}
                      onClick={() => act("dispute", "Dispute")}
                    >
                      Dispute instead
                    </button>
                  )}
                </div>
              )}

              {!address && (
                <p className="mt-3 text-xs text-warn">
                  Connect the right wallet to act on this retainer.
                </p>
              )}
            </div>
          )}

          {r.state === "Disputed" && (
            <div className="mb-6">
              <DisputePanel retainer={r} viewer={address} onTx={pushNotice} />
            </div>
          )}

          <div className="custos-card p-6">
            <div className="mb-3 text-xs uppercase tracking-wider text-faint">
              Details
            </div>
            <Fact k="Escrowed amount" v={`${formatAmount(r.lockAmount)} ${TOKEN_SYMBOL}`} accent="gold" />
            <Fact k="Signing bonus (paid at hire)" v={`${formatAmount(r.upfrontAmount)} ${TOKEN_SYMBOL}`} />
            <Fact
              k="Delivery deadline"
              v={
                r.deliveryDeadline > Math.floor(Date.now() / 1000)
                  ? `timestamp ${r.deliveryDeadline}`
                  : `timestamp ${r.deliveryDeadline} (passed)`
              }
            />
            {r.approvalDeadline > 0 && (
              <Fact
                k="Approval deadline"
                v={
                  r.approvalDeadline > Math.floor(Date.now() / 1000)
                    ? `timestamp ${r.approvalDeadline}`
                    : `timestamp ${r.approvalDeadline} (passed)`
                }
              />
            )}
            <FactRow k="Client">
              <Address address={r.client} viewer={address} />
            </FactRow>
            <FactRow k="Freelancer">
              <Address address={r.freelancer} viewer={address} />
            </FactRow>
            <Fact k="Token" v={r.token} mono link={explorerAddress(r.token)} />
            <div className="mt-3 text-xs text-faint">Current block: {block}</div>
          </div>
        </>
      )}

      <TxToasts notices={notices} onDismiss={(nid) => setNotices((n) => (n.filter((x) => x.id !== nid)))} />
    </main>
  );
}

function Fact({
  k,
  v,
  mono,
  accent,
  link,
}: {
  k: string;
  v: string;
  mono?: boolean;
  accent?: "gold" | "accent";
  link?: string;
}) {
  const color = accent === "gold" ? "text-gold" : accent === "accent" ? "text-accent" : "text-fg";
  const val = (
    <span className={`${mono ? "tabular" : ""} ${color} max-w-[16rem] truncate`} title={v}>
      {v}
    </span>
  );
  return (
    <FactRow k={k}>
      {link ? (
        <a href={link} target="_blank" rel="noreferrer" className="hover:underline">
          {val}
        </a>
      ) : (
        val
      )}
    </FactRow>
  );
}

function FactRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-2.5 text-sm last:border-0">
      <span className="shrink-0 text-muted">{k}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  );
}
