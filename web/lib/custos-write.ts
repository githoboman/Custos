"use client";

// Wallet-signed calls into the deployed custos contract, using @stacks/connect
// v8's request() API (WBIP-compatible — works with Xverse and current Leather).
// Each call opens the wallet to sign an stx_callContract transaction.

// @stacks/connect is imported lazily (see call()) to keep its heavy
// WalletConnect dependency chain out of the SSR/hydration path.
import {
  Cl,
  uintCV,
  standardPrincipalCV,
  contractPrincipalCV,
  type ClarityValue,
} from "@stacks/transactions";
import {
  CUSTOS_ID,
  NETWORK_NAME,
  TOKEN_ADDRESS,
  TOKEN_ID,
  TOKEN_NAME,
} from "./config";

type OnFinish = (txId: string) => void;

const tokenCV = () => contractPrincipalCV(TOKEN_ADDRESS, TOKEN_NAME);

async function call(
  contractId: string,
  functionName: string,
  functionArgs: ClarityValue[],
  onFinish?: OnFinish,
  onCancel?: () => void
) {
  try {
    const { request } = await import("@stacks/connect");
    const res = await request("stx_callContract", {
      contract: contractId as `${string}.${string}`,
      functionName,
      // Serialize to hex — the most robust arg format across Leather/Xverse.
      functionArgs: functionArgs.map((a) => Cl.serialize(a)),
      network: NETWORK_NAME,
      // "allow" is REQUIRED: our contract moves SIP-010 tokens the wallet can't
      // predict from post-conditions. Without this the wallet aborts/refuses
      // ("transaction not going"). The contract itself enforces all amounts.
      postConditionMode: "allow",
    });
    if (res?.txid) {
      onFinish?.(res.txid);
    } else {
      console.warn(`${functionName}: no txid returned`, res);
      onCancel?.();
    }
  } catch (e) {
    // user rejected in wallet, or the request failed
    console.warn(`${functionName} cancelled/failed:`, e);
    onCancel?.();
  }
}

export function createRetainer(
  args: {
    freelancer: string;
    upfront: bigint;
    lock: bigint;
    deliveryWindow: number;
    approvalWindow: number;
  },
  onFinish?: OnFinish,
  onCancel?: () => void
) {
  return call(
    CUSTOS_ID,
    "create-retainer",
    [
      tokenCV(),
      standardPrincipalCV(args.freelancer),
      uintCV(args.upfront),
      uintCV(args.lock),
      uintCV(args.deliveryWindow),
      uintCV(args.approvalWindow),
    ],
    onFinish,
    onCancel
  );
}

export function markDelivered(id: number, onFinish?: OnFinish, onCancel?: () => void) {
  return call(CUSTOS_ID, "mark-delivered", [uintCV(id)], onFinish, onCancel);
}

export function approveAndRelease(id: number, onFinish?: OnFinish, onCancel?: () => void) {
  return call(CUSTOS_ID, "approve-and-release", [uintCV(id), tokenCV()], onFinish, onCancel);
}

export function autoRelease(id: number, onFinish?: OnFinish, onCancel?: () => void) {
  return call(CUSTOS_ID, "auto-release", [uintCV(id), tokenCV()], onFinish, onCancel);
}

export function dispute(id: number, onFinish?: OnFinish, onCancel?: () => void) {
  return call(CUSTOS_ID, "dispute", [uintCV(id)], onFinish, onCancel);
}

export function resolveDispute(
  id: number,
  freelancerAmount: bigint,
  onFinish?: OnFinish,
  onCancel?: () => void
) {
  return call(
    CUSTOS_ID,
    "resolve-dispute",
    [uintCV(id), uintCV(freelancerAmount), tokenCV()],
    onFinish,
    onCancel
  );
}

export function reclaimAbandoned(id: number, onFinish?: OnFinish, onCancel?: () => void) {
  return call(CUSTOS_ID, "reclaim-abandoned", [uintCV(id), tokenCV()], onFinish, onCancel);
}

// Mint test tokens to yourself (test-usdcx has an open mint), so demoers can
// fund a wallet without leaving the app.
export function mintTestTokens(amount: bigint, recipient: string, onFinish?: OnFinish) {
  return call(
    TOKEN_ID,
    "mint",
    [uintCV(amount), standardPrincipalCV(recipient)],
    onFinish
  );
}
