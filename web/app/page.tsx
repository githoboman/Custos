"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { Brand, ShieldMark } from "@/components/Brand";
import { WalletButton } from "@/components/WalletButton";
import {
  CUSTOS_ADDRESS,
  BOTCHAIN_MAINNET,
  BOTCHAIN_TESTNET,
  BOTCHAIN_WEBSITE,
  BOTCHAIN_EXPLORER,
  GITHUB_REPO,
  explorerAddress,
} from "@/lib/config";

export default function Landing() {
  const { isConnected, isMainnet } = useWallet();
  const router = useRouter();

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Brand />
        <div className="flex items-center gap-4">
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noreferrer"
            className="hidden text-sm text-muted hover:text-fg sm:block transition-colors"
          >
            GitHub
          </a>
          <a
            href={BOTCHAIN_WEBSITE}
            target="_blank"
            rel="noreferrer"
            className="hidden text-sm text-accent hover:underline sm:block transition-colors"
          >
            BOT Chain ↗
          </a>
          <WalletButton />
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-5xl px-6 pb-8 pt-14 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs text-muted">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span className="font-medium text-fg">Officially Launched on BOT Chain Mainnet</span>
          <span className="text-faint">· Chain ID 677</span>
        </div>
        <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-fg sm:text-5xl">
          Freelance payment,
          <br />
          <span className="text-accent">held in trust.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          Custos pays the signing bonus instantly and holds the rest in real
          on-chain escrow — released only on approved delivery, auto-released if
          the client goes silent, or split by mutual agreement. Built natively on BOT Chain.
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
            Connect an EVM wallet (MetaMask, OKX, Bitget, BO Wallet) to act — you can browse either space first.
          </p>
        )}
      </section>

      {/* Flow Steps */}
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

      {/* Trust & Architecture */}
      <section className="mx-auto max-w-5xl px-6 pb-12">
        <div className="custos-card grid gap-6 p-8 sm:grid-cols-3">
          <Trust
            title="Real escrow, not a wrapper"
            body="Funds are held by the contract itself and can reach a third party — fully autonomous, decentralized, and non-custodial."
          />
          <Trust
            title="No hidden arbitrator"
            body="Disputes resolve by mutual consent; both sides propose a split and it executes only when they match. Proposals are public on-chain."
          />
          <Trust
            title="Verifiable on BOTScan"
            body={
              <>
                Every action is an on-chain transaction you can inspect.{" "}
                <a
                  href={`https://scan.botchain.ai/address/${BOTCHAIN_MAINNET.custosAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline inline-flex items-center gap-0.5"
                >
                  View Mainnet Contract ↗
                </a>
              </>
            }
          />
        </div>
      </section>

      {/* Ecosystem & Partnerships Section (Required by BOT Chain) */}
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-2xl border border-line bg-surface/60 p-8 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 rounded-md bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                Ecosystem & Infrastructure
              </div>
              <h3 className="font-display text-xl font-bold text-fg">
                Powered by BOT Chain
              </h3>
              <p className="max-w-md text-sm text-muted">
                Custos operates natively on BOT Chain, leveraging high-throughput EVM execution, sub-second finality, and ultra-low gas fees for freelance escrow and autonomous AI Agent agreements.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href={BOTCHAIN_WEBSITE}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-sm font-semibold text-fg hover:border-accent hover:text-accent transition-all"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/20 text-accent font-bold text-xs">
                  BOT
                </span>
                <span>BOT Chain Official</span>
                <span className="text-xs text-muted">↗</span>
              </a>

              <a
                href={BOTCHAIN_EXPLORER}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-sm font-semibold text-fg hover:border-accent hover:text-accent transition-all"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gold/20 text-gold font-bold text-xs">
                  🔍
                </span>
                <span>BOTScan Explorer</span>
                <span className="text-xs text-muted">↗</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer with BOT Chain Logo, Name, and Links */}
      <footer className="border-t border-line mt-12 bg-surface/30">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 pb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-display text-base font-bold text-fg">
                <ShieldMark size={18} />
                <span>Custos Protocol</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Decentralized, non-custodial milestone retainers and trustless escrow protocol.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-fg">BOT Chain Ecosystem</div>
              <ul className="space-y-1.5 text-muted">
                <li>
                  <a
                    href="https://botchain.ai"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-accent transition-colors"
                  >
                    BOT Chain Website (botchain.ai) ↗
                  </a>
                </li>
                <li>
                  <a
                    href="https://scan.botchain.ai"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-accent transition-colors"
                  >
                    BOTScan Explorer (scan.botchain.ai) ↗
                  </a>
                </li>
                <li>
                  <a
                    href="https://dex.botchain.ai/#/swap"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-accent transition-colors"
                  >
                    B DEX Swap ↗
                  </a>
                </li>
                <li>
                  <a
                    href="https://faucet.botchain.ai"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-accent transition-colors"
                  >
                    Testnet Faucet ↗
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-fg">Smart Contracts</div>
              <ul className="space-y-1.5 text-muted">
                <li>
                  <a
                    href={`https://scan.botchain.ai/address/${BOTCHAIN_MAINNET.custosAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-accent transition-colors"
                  >
                    Mainnet: {BOTCHAIN_MAINNET.custosAddress.slice(0, 6)}...{BOTCHAIN_MAINNET.custosAddress.slice(-4)} ↗
                  </a>
                </li>
                <li>
                  <a
                    href={`https://scan.bohr.life/address/${BOTCHAIN_TESTNET.custosAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-accent transition-colors"
                  >
                    Testnet: {BOTCHAIN_TESTNET.custosAddress.slice(0, 6)}...{BOTCHAIN_TESTNET.custosAddress.slice(-4)} ↗
                  </a>
                </li>
                <li>
                  <span className="text-faint">Standard: EVM Solidity 0.8.20</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-fg">Resources</div>
              <ul className="space-y-1.5 text-muted">
                <li>
                  <a
                    href={GITHUB_REPO}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-accent transition-colors"
                  >
                    GitHub Source Code ↗
                  </a>
                </li>
                <li>
                  <a
                    href="https://x.com/BOTChain_ai"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-accent transition-colors"
                  >
                    @BOTChain_ai on X ↗
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-line/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-faint">
            <div className="flex items-center gap-2">
              <ShieldMark size={14} />
              <span>Custos Protocol · Officially Launched on BOT Chain Mainnet</span>
            </div>
            <div>
              © 2026 Custos Protocol. Built for the BOT Chain ecosystem.
            </div>
          </div>
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
