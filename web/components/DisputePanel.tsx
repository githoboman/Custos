"use client";

import { useEffect, useState } from "react";
import type { Retainer } from "@/lib/types";
import { formatAmount, parseAmount } from "@/lib/format";
import { getDisputeProposal } from "@/lib/custos-read";
import { TOKEN_SYMBOL } from "@/lib/config";
import * as write from "@/lib/custos-write";

interface Props {
  retainer: Retainer;
  viewer: string | null;
  onTx: (label: string, txId: string) => void;
}

export function DisputePanel({ retainer: r, viewer, onTx }: Props) {
  const [clientProp, setClientProp] = useState<bigint | null>(null);
  const [freelancerProp, setFreelancerProp] = useState<bigint | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getDisputeProposal(Number(r.id), r.client).then(setClientProp).catch(() => {});
    getDisputeProposal(Number(r.id), r.freelancer).then(setFreelancerProp).catch(() => {});
  }, [r.id, r.client, r.freelancer]);

  const submit = () => {
    const amount = parseAmount(input);
    if (amount > r.lockAmount) return;
    setBusy(true);
    write.resolveDispute(Number(r.id), amount, (txId) => {
      onTx("resolve-dispute", txId);
      setBusy(false);
    });
    setTimeout(() => setBusy(false), 400);
  };

  const proposalsMatch =
    clientProp !== null &&
    freelancerProp !== null &&
    clientProp === freelancerProp;

  return (
    <div className="mt-4 rounded border border-line bg-abyss p-4">
      <p className="mb-3 text-xs text-muted">
        Both parties independently propose how much of the escrow goes to the
        freelancer. The split executes automatically once{" "}
        <strong className="text-fg">both propose the same amount</strong>.
        Proposals are public on-chain the moment they're submitted — this is an
        open negotiation, not a sealed bid.
      </p>

      <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
        <Prop label="Client proposes" value={clientProp} />
        <Prop label="Freelancer proposes" value={freelancerProp} />
      </div>

      {proposalsMatch && (
        <p className="mb-3 text-xs text-accent">
          Proposals match — the next matching submission settles the split.
        </p>
      )}

      <label className="mb-1 block text-xs text-muted">
        Your proposed amount to freelancer (max {formatAmount(r.lockAmount)})
      </label>
      <div className="flex gap-3">
        <input
          className="custos-input tabular"
          placeholder="e.g. 6000"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          className="custos-btn custos-btn--primary shrink-0"
          disabled={busy || input === ""}
          onClick={submit}
        >
          {busy ? "Submitting…" : "Submit split"}
        </button>
      </div>
    </div>
  );
}

function Prop({ label, value }: { label: string; value: bigint | null }) {
  return (
    <div className="rounded border border-line bg-surface p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="tabular mt-1 text-fg">
        {value === null ? (
          <span className="text-faint">none yet</span>
        ) : (
          `${formatAmount(value)} ${TOKEN_SYMBOL}`
        )}
      </div>
    </div>
  );
}
