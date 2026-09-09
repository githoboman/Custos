"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { Brand, ShieldMark } from "@/components/Brand";
import { WalletButton } from "@/components/WalletButton";
import { CUSTOS_ADDRESS, explorerAddress } from "@/lib/config";

export default function Landing() {
  const { isConnected } = useWallet();
  const router = useRouter();

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Brand />
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/yashpunmiya/Flowvault"
            target="_blank"
            rel="noreferrer"
            className="hidden text-sm text-muted hover:text-fg sm:block"
          >
            Open source
          </a>
          <WalletButton />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 pb-8 pt-14 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          Live on BOT Chain testnet · verifiable on-chain
        </div>
        <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-fg sm:text-5xl">
          Freelance payment,
          <br />
          <span className="text-accent">held in trust.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          Custos pays the signing bonus instantly and holds the rest in real
          on-chain escrow — released only on approved delivery, auto-released if
          the client goes silent, or split by mutual agreement. Every step is a
          record you can verify.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <RoleCard
            title="I'm hiring"
            desc="Post an offer, fund escrow, approve & release."
            onClick={() => router.push("/app/client")}
            primary
          />
          <RoleCard
            title="I've been hired"
            desc="See your work, mark delivered, get paid."
            onClick={() => router.push("/app/freelancer")}
          />
        </div>
        {!isConnected && (
          <p className="mt-4 text-xs text-faint">
            Connect an EVM wallet (MetaMask, etc.) to act — you can browse
            either space first.
          </p>
        )}
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <h2 className="mb-8 text-center font-display text-2xl font-semibold text-fg">
          How a retainer flows
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Flow n="1" title="Hire & fund" body="Client pays the signing bonus instantly and locks the rest in the Custos contract." />
          <Flow n="2" title="Deliver" body="The freelancer marks the work delivered, opening the client's approval window." />
          <Flow n="3" title="Approve" body="Client approves and the escrow releases — or disputes if something's wrong." />
          <Flow n="4" title="Settle" body="Funds reach the freelancer: by approval, by auto-release, or by an agreed split." verified />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="custos-card grid gap-6 p-8 sm:grid-cols-3">
          <Trust
            title="Real escrow, not a wrapper"
            body="Funds are held by the contract itself and can reach a third party — the exact thing FlowVault's lock structurally can't do."
          />
          <Trust
            title="No hidden arbitrator"
            body="Disputes resolve by mutual consent; both sides propose a split and it executes only when they match. Proposals are public on-chain."
          />
          <Trust
            title="Verifiable end to end"
            body={
              <>
                Every action is a testnet transaction you can inspect.{" "}
                <a href={explorerAddress(CUSTOS_ADDRESS)} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  View the contract ↗
                </a>
              </>
            }
          />
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-6 py-8 text-xs text-faint">
        <div className="flex items-center gap-2">
          <ShieldMark size={14} />
          Custos · true escrow on BOT Chain · {CUSTOS_ADDRESS}
        </div>
      </footer>
    </main>
  );
}

function RoleCard({
  title,
  desc,
  onClick,
  primary,
}: {
  title: string;
  desc: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group w-full max-w-xs rounded-lg border p-5 text-left transition-all hover:-translate-y-0.5 sm:w-64 ${
        primary
          ? "border-accent bg-accent-soft"
          : "border-line bg-surface hover:border-line-strong"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`font-display text-lg font-semibold ${primary ? "text-accent" : "text-fg"}`}>
          {title}
        </span>
        <span className={primary ? "text-accent" : "text-faint"}>→</span>
      </div>
      <p className="mt-1 text-sm text-muted">{desc}</p>
    </button>
  );
}

function Flow({ n, title, body, verified }: { n: string; title: string; body: string; verified?: boolean }) {
  return (
    <div className="custos-card p-5">
      <div
        className={`mb-3 grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ${
          verified ? "bg-gold text-inverse" : "bg-accent-soft text-accent"
        }`}
      >
        {verified ? "✓" : n}
      </div>
      <div className="font-display font-semibold text-fg">{title}</div>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}

function Trust({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-display font-semibold text-fg">{title}</div>
      <p className="text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
