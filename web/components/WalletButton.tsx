"use client";

import { useState, useRef, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { shortAddr, addrColor } from "@/lib/format";
import { explorerAddress } from "@/lib/config";

export function WalletButton() {
  const { address, isConnected, ready, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!ready) {
    return (
      <div className="h-9 w-28 animate-pulse rounded-full bg-overlay" aria-hidden />
    );
  }

  if (!isConnected) {
    return (
      <button className="custos-btn custos-btn--primary" onClick={connect}>
        Connect wallet
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3 transition-colors hover:border-line-strong"
      >
        <span
          className="h-6 w-6 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: addrColor(address!) }}
          aria-hidden
        />
        <span className="tabular text-sm font-medium text-fg">{shortAddr(address!)}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" className={`text-faint transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-line bg-surface-raised p-2 shadow-lg">
          <div className="border-b border-line px-3 pb-2 pt-1">
            <div className="text-xs text-muted">Connected wallet</div>
            <div className="tabular mt-0.5 break-all text-sm text-fg">{address}</div>
          </div>
          <MenuItem onClick={() => navigator.clipboard?.writeText(address!)}>Copy address</MenuItem>
          <a
            href={explorerAddress(address!)}
            target="_blank"
            rel="noreferrer"
            className="block rounded px-3 py-2 text-sm text-fg no-underline hover:bg-overlay"
          >
            View on explorer ↗
          </a>
          <MenuItem danger onClick={disconnect}>
            Disconnect
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`block w-full rounded px-3 py-2 text-left text-sm hover:bg-overlay ${
        danger ? "text-danger" : "text-fg"
      }`}
    >
      {children}
    </button>
  );
}
