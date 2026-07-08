// Read-only views of the deployed custos contract + token balances.

import {
  fetchCallReadOnlyFunction,
  cvToValue,
  uintCV,
  standardPrincipalCV,
} from "@stacks/transactions";
import {
  CUSTOS_ADDRESS,
  CUSTOS_NAME,
  NETWORK,
  TOKEN_ADDRESS,
  TOKEN_NAME,
} from "./config";
import type { Retainer, RetainerState } from "./types";

async function readCustos(fn: string, args: any[], sender: string) {
  return fetchCallReadOnlyFunction({
    contractAddress: CUSTOS_ADDRESS,
    contractName: CUSTOS_NAME,
    functionName: fn,
    functionArgs: args,
    senderAddress: sender,
    network: NETWORK,
  });
}

export async function getNextId(sender: string): Promise<number> {
  const cv = await readCustos("get-next-id", [], sender);
  return Number(cvToValue(cv));
}

export async function getRetainer(
  id: number,
  sender: string
): Promise<Retainer | null> {
  const cv = await readCustos("get-retainer", [uintCV(id)], sender);
  const val = cvToValue(cv);
  // (optional ...) => cvToValue gives { type, value } or null when none
  const tuple = val?.value ?? val;
  if (!tuple || typeof tuple !== "object" || !tuple.state) return null;

  const g = (k: string) => tuple[k]?.value ?? tuple[k];
  return {
    id,
    client: String(g("client")),
    freelancer: String(g("freelancer")),
    token: String(g("token")),
    upfrontAmount: BigInt(g("upfront-amount")),
    lockAmount: BigInt(g("lock-amount")),
    deliveryDeadline: Number(g("delivery-deadline")),
    approvalWindow: Number(g("approval-window")),
    approvalDeadline: Number(g("approval-deadline")),
    state: String(g("state")) as RetainerState,
  };
}

// Fetch all retainers 0..next-1. Fine for a demo; a production app would index.
export async function getAllRetainers(sender: string): Promise<Retainer[]> {
  const next = await getNextId(sender);
  const ids = Array.from({ length: next }, (_, i) => i);
  const results = await Promise.all(ids.map((id) => getRetainer(id, sender)));
  return results.filter((r): r is Retainer => r !== null).reverse();
}

export async function getDisputeProposal(
  id: number,
  proposer: string,
  sender: string
): Promise<bigint | null> {
  const cv = await readCustos(
    "get-dispute-proposal",
    [uintCV(id), standardPrincipalCV(proposer)],
    sender
  );
  const val = cvToValue(cv);
  const inner = val?.value ?? val;
  if (inner === null || inner === undefined) return null;
  return BigInt(inner);
}

export async function getTokenBalance(who: string): Promise<bigint> {
  const cv = await fetchCallReadOnlyFunction({
    contractAddress: TOKEN_ADDRESS,
    contractName: TOKEN_NAME,
    functionName: "get-balance",
    functionArgs: [standardPrincipalCV(who)],
    senderAddress: who,
    network: NETWORK,
  });
  const val = cvToValue(cv);
  return BigInt(val?.value ?? val ?? 0);
}

// Current stacks block height (for deadline countdowns).
export async function getBlockHeight(): Promise<number> {
  const res = await fetch(`${NETWORK.client.baseUrl}/v2/info`);
  const info = await res.json();
  return Number(info.stacks_tip_height ?? 0);
}
