"use client";

import { useState } from "react";
import { shortAddr, addrColor } from "@/lib/format";
import { explorerAddress } from "@/lib/config";

interface Props {
  address: string;
  viewer?: string | null; // if this === address, we mark it "You"
  label?: string; // optional role label, e.g. "Client"
  showCopy?: boolean;
  link?: boolean;
  size?: "sm" | "md";
}

// One consistent way to render an address everywhere: a colour identicon dot so
// parties are distinguishable, the short form, a "You" tag when it's the
// connected wallet, and optional copy + explorer link.
export function Address({
  address,
  viewer,
  label,
  showCopy = true,
  link = true,
  size = "md",
}: Props) {
  const [copied, setCopied] = useState(false);
  const isYou = !!viewer && viewer === address;
  const dot = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const text = size === "sm" ? "text-xs" : "text-sm";

  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  const inner = (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`${dot} shrink-0 rounded-full ring-1 ring-black/10`}
        style={{ backgroundColor: addrColor(address) }}
        aria-hidden
      />
      <span className={`tabular ${text} ${isYou ? "font-medium text-fg" : "text-fg"}`}>
        {shortAddr(address)}
      </span>
      {isYou && (
        <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-accent">
          You
        </span>
      )}
      {label && !isYou && (
        <span className="text-[0.7rem] uppercase tracking-wide text-faint">{label}</span>
      )}
    </span>
  );

  return (
    <span className="inline-flex items-center gap-1.5">
      {link ? (
        <a
          href={explorerAddress(address)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="no-underline hover:opacity-80"
          title={address}
        >
          {inner}
        </a>
      ) : (
        <span title={address}>{inner}</span>
      )}
      {showCopy && (
        <button
          onClick={copy}
          className="text-faint hover:text-fg"
          title="Copy address"
          aria-label="Copy address"
        >
          {copied ? (
            <span className="text-[0.7rem] text-gold">copied</span>
          ) : (
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <rect x="3.5" y="3.5" width="7" height="7" rx="1.3" stroke="currentColor" strokeWidth="1.2" />
              <path d="M2.5 8.5V2.5H8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      )}
    </span>
  );
}
