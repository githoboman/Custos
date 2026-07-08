import { TOKEN_DECIMALS, TOKEN_SYMBOL } from "./config";

// Format a base-unit bigint amount (e.g. micro-tUSDCx) as a human string.
export function formatAmount(base: bigint | number, withSymbol = false): string {
  const v = typeof base === "number" ? BigInt(Math.trunc(base)) : base;
  const denom = BigInt(10) ** BigInt(TOKEN_DECIMALS);
  const whole = v / denom;
  const frac = v % denom;
  let s = whole.toLocaleString("en-US");
  if (frac > 0n) {
    const fracStr = frac.toString().padStart(TOKEN_DECIMALS, "0").replace(/0+$/, "");
    s += "." + fracStr;
  }
  return withSymbol ? `${s} ${TOKEN_SYMBOL}` : s;
}

// Parse a human amount string ("8,000" or "8000.5") into base units.
export function parseAmount(input: string): bigint {
  const clean = input.replace(/,/g, "").trim();
  if (clean === "" || isNaN(Number(clean))) return 0n;
  const [whole, frac = ""] = clean.split(".");
  const denom = BigInt(10) ** BigInt(TOKEN_DECIMALS);
  const fracPadded = (frac + "0".repeat(TOKEN_DECIMALS)).slice(0, TOKEN_DECIMALS);
  return BigInt(whole || "0") * denom + BigInt(fracPadded || "0");
}

export function shortAddr(addr: string): string {
  if (!addr) return "";
  const [base] = addr.split(".");
  if (base.length <= 12) return addr;
  return `${base.slice(0, 5)}…${base.slice(-4)}`;
}

// Deterministic pastel colour for an address, so client vs freelancer are
// visually distinguishable at a glance (a tiny "identicon" dot).
export function addrColor(addr: string): string {
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = (h * 31 + addr.charCodeAt(i)) % 360;
  return `hsl(${h} 62% 55%)`;
}

// A rough blocks -> time estimate (testnet ~ tenure blocks). Informational only.
export function blocksToRough(blocks: number): string {
  if (blocks <= 0) return "now";
  const mins = blocks * 0.5; // ~30s/block ballpark, clearly labeled as rough
  if (mins < 60) return `~${Math.round(mins)}m`;
  const hrs = mins / 60;
  if (hrs < 24) return `~${hrs.toFixed(1)}h`;
  return `~${(hrs / 24).toFixed(1)}d`;
}
