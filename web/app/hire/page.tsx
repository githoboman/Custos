"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { Header } from "@/components/Header";
import { HireForm } from "@/components/HireForm";
import { TxToasts, type TxNotice } from "@/components/TxToast";

function HireInner() {
  const { address, isConnected } = useWallet();
  const router = useRouter();
  const params = useSearchParams();
  const [notices, setNotices] = useState<TxNotice[]>([]);

  const prefillAddress = params.get("to") ?? undefined;
  const prefillRole = params.get("role") ?? undefined;

  const pushNotice = (label: string, txId: string) => {
    setNotices((n) => [...n, { id: Date.now(), label, txId }]);
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Header />

      <section className="mb-8">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-fg">Hire a freelancer</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Make an offer backed by real escrow. Pay a signing bonus up front, then
          lock the rest in the Custos contract — released to the freelancer on
          approved delivery, and reclaimable by you if they never deliver.
        </p>
        {prefillAddress && (
          <p className="mt-2 text-sm text-accent">
            Hiring from the directory — freelancer address filled in below.
          </p>
        )}
      </section>

      {isConnected ? (
        <HireForm
          viewer={address}
          onTx={pushNotice}
          onDone={() => router.push("/app/client")}
          prefillAddress={prefillAddress}
          prefillRole={prefillRole}
        />
      ) : (
        <div className="custos-card p-6 text-sm text-muted">
          Connect a Stacks wallet (Leather / Xverse) to post a hire offer.
        </div>
      )}

      <TxToasts
        notices={notices}
        onDismiss={(id) => setNotices((n) => n.filter((x) => x.id !== id))}
      />
    </main>
  );
}

export default function HirePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-muted">Loading…</div>}>
      <HireInner />
    </Suspense>
  );
}
