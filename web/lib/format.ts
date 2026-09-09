import { TOKEN_DECIMALS, TOKEN_SYMBOL } from "./config";

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
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 5)}…${addr.slice(-4)}`;
}

export function addrColor(addr: string): string {
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = (h * 31 + addr.charCodeAt(i)) % 360;
  return `hsl(${h} 62% 55%)`;
}

export function blocksToRough(blocks: number): string {
  if (blocks <= 0) return "now";
  const mins = blocks * 0.5;
  if (mins < 60) return `~${Math.round(mins)}m`;
  const hrs = mins / 60;
  if (hrs < 24) return `~${hrs.toFixed(1)}h`;
  return `~${(hrs / 24).toFixed(1)}d`;
}
