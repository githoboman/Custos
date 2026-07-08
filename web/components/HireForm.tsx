"use client";

import { useEffect, useState } from "react";
import { parseAmount, formatAmount, shortAddr } from "@/lib/format";
import { TOKEN_SYMBOL } from "@/lib/config";
import { listProfiles, seedIfEmpty, type Profile } from "@/lib/profiles";
import * as write from "@/lib/custos-write";

interface Props {
  viewer: string | null;
  onTx: (label: string, txId: string) => void;
  onDone?: () => void;
  prefillAddress?: string; // when hiring from a directory profile
  prefillRole?: string;
}

// Hire = ONE real transaction. create-retainer pays the signing bonus to the
// freelancer AND locks the escrow, in a single signature. Both legs are real
// on-chain (no stub). The escrow is released later on approval / auto-release /
// dispute split.
export function HireForm({ viewer, onTx, onDone, prefillAddress, prefillRole }: Props) {
  const [role, setRole] = useState(prefillRole ?? "");
  const [freelancer, setFreelancer] = useState(prefillAddress ?? "");
  // Low test values: 0.1 bonus + 0.5 escrow = 0.6 total per hire.
  const [upfront, setUpfront] = useState("0.1");
  const [lock, setLock] = useState("0.5");
  const [deliveryWindow, setDeliveryWindow] = useState("10");
  const [approvalWindow, setApprovalWindow] = useState("10");
  const [busy, setBusy] = useState(false);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [manualEntry, setManualEntry] = useState(!!prefillAddress);
  useEffect(() => {
    seedIfEmpty();
    setProfiles(listProfiles().filter((p) => p.address !== viewer));
  }, [viewer]);

  const validAddr = /^ST[0-9A-Z]{38,40}$/.test(freelancer.trim());
  const selfHire = validAddr && freelancer.trim() === viewer;
  const upfrontBase = parseAmount(upfront);
  const lockBase = parseAmount(lock);
  const total = upfrontBase + lockBase;

  const canHire =
    validAddr &&
    !selfHire &&
    total > 0n &&
    Number(deliveryWindow) > 0 &&
    Number(approvalWindow) > 0 &&
    !busy;

  const hire = () => {
    setBusy(true);
    write.createRetainer(
      {
        freelancer: freelancer.trim(),
        upfront: upfrontBase, // signing bonus, paid to freelancer immediately
        lock: lockBase, // escrow, held by the contract
        deliveryWindow: Number(deliveryWindow) || 0,
        approvalWindow: Number(approvalWindow) || 0,
      },
      (txId) => {
        onTx("Hire — bonus paid & escrow locked", txId);
        setBusy(false);
        onDone?.();
      },
      () => setBusy(false)
    );
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      {/* form */}
      <div className="custos-card custos-card--raised p-6">
        <Field label="Role / engagement">
          <input
            className="custos-input"
            placeholder="e.g. Landing page redesign"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </Field>

        <Field label="Who are you hiring?">
          {!manualEntry ? (
            <>
              <select
                className="custos-input"
                value={freelancer}
                onChange={(e) => {
                  const p = profiles.find((x) => x.address === e.target.value);
                  setFreelancer(e.target.value);
                  if (p && !role) setRole(p.title);
                }}
              >
                <option value="">Choose a freelancer from the directory…</option>
                {profiles.map((p) => (
                  <option key={p.address} value={p.address}>
                    {p.name} — {p.title} ({shortAddr(p.address)})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="mt-2 text-xs text-accent hover:underline"
                onClick={() => {
                  setFreelancer("");
                  setManualEntry(true);
                }}
              >
                Or enter a wallet address manually
              </button>
              {profiles.length === 0 && (
                <p className="mt-1 text-xs text-faint">
                  No freelancer profiles yet — use manual entry, or ask them to
                  create a profile in “My work”.
                </p>
              )}
            </>
          ) : (
            <>
              <input
                className="custos-input tabular"
                placeholder="ST…"
                value={freelancer}
                onChange={(e) => setFreelancer(e.target.value)}
              />
              {profiles.length > 0 && (
                <button
                  type="button"
                  className="mt-2 text-xs text-accent hover:underline"
                  onClick={() => {
                    setFreelancer("");
                    setManualEntry(false);
                  }}
                >
                  ← Pick from the directory instead
                </button>
              )}
            </>
          )}
          {freelancer && !validAddr && (
            <p className="mt-1 text-xs text-danger">Not a valid Stacks address.</p>
          )}
          {selfHire && (
            <p className="mt-1 text-xs text-danger">You can&apos;t hire yourself.</p>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={`Signing bonus (${TOKEN_SYMBOL})`}>
            <input className="custos-input tabular" value={upfront} onChange={(e) => setUpfront(e.target.value)} />
            <p className="mt-1 text-xs text-faint">Paid to them right away.</p>
          </Field>
          <Field label={`Escrow (${TOKEN_SYMBOL})`}>
            <input className="custos-input tabular" value={lock} onChange={(e) => setLock(e.target.value)} />
            <p className="mt-1 text-xs text-faint">Held until they deliver.</p>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Delivery window (blocks)">
            <input className="custos-input tabular" value={deliveryWindow} onChange={(e) => setDeliveryWindow(e.target.value)} />
          </Field>
          <Field label="Approval window (blocks)">
            <input className="custos-input tabular" value={approvalWindow} onChange={(e) => setApprovalWindow(e.target.value)} />
          </Field>
        </div>

        <div className="mb-4 rounded border border-line bg-abyss p-3 text-xs text-muted">
          One signature does it all: pays the{" "}
          <span className="text-accent">{formatAmount(upfrontBase)} {TOKEN_SYMBOL}</span> bonus to the
          freelancer <strong className="text-fg">and</strong> locks{" "}
          <span className="text-gold">{formatAmount(lockBase)} {TOKEN_SYMBOL}</span> in escrow.
        </div>

        <button className="custos-btn custos-btn--primary w-full" disabled={!canHire} onClick={hire}>
          {busy
            ? "Confirm in your wallet…"
            : `Hire & lock ${formatAmount(total)} ${TOKEN_SYMBOL}`}
        </button>
        {busy && (
          <p className="mt-2 text-center text-xs text-faint">
            Approve the transaction in Leather / Xverse.
          </p>
        )}
      </div>

      {/* live offer summary */}
      <aside className="custos-card p-5 h-fit">
        <div className="mb-3 text-xs uppercase tracking-wider text-faint">Offer summary</div>
        <SummaryRow k="Role" v={role || "—"} />
        <SummaryRow k="Freelancer" v={validAddr ? shortAddr(freelancer) : "—"} mono />
        <SummaryRow k="Signing bonus" v={`${formatAmount(upfrontBase)} ${TOKEN_SYMBOL}`} mono accent />
        <SummaryRow k="Escrowed" v={`${formatAmount(lockBase)} ${TOKEN_SYMBOL}`} mono gold />
        <div className="my-3 border-t border-line" />
        <SummaryRow k="You pay now" v={`${formatAmount(total)} ${TOKEN_SYMBOL}`} mono strong />
        <div className="mt-4 text-xs leading-relaxed text-faint">
          The bonus reaches the freelancer immediately. The escrow is guarded by
          the contract and only moves on approval, on auto-release if you go
          silent, or by a mutually-agreed dispute split.
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-xs text-muted">{label}</label>
      {children}
    </div>
  );
}

function SummaryRow({
  k,
  v,
  mono,
  accent,
  gold,
  strong,
}: {
  k: string;
  v: string;
  mono?: boolean;
  accent?: boolean;
  gold?: boolean;
  strong?: boolean;
}) {
  const color = accent ? "text-accent" : gold ? "text-gold" : "text-fg";
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted">{k}</span>
      <span className={`${mono ? "tabular" : ""} ${color} ${strong ? "font-semibold" : ""}`}>{v}</span>
    </div>
  );
}
