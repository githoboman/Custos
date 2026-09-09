// Read-only views of the deployed custos contract + token balances.

import { ethers } from "ethers";
import { CUSTOS_ADDRESS, TOKEN_ADDRESS, NETWORK } from "./config";
import type { Retainer, RetainerState } from "./types";

const CUSTOS_ABI: ethers.InterfaceAbi = [
  "function nextId() external view returns (uint256)",
  "function getRetainer(uint256 id) external view returns (tuple(address client, address freelancer, address token, uint256 upfrontAmount, uint256 lockAmount, uint256 deliveryDeadline, uint256 approvalWindow, uint256 approvalDeadline, uint8 state))",
  "function getDisputeProposal(uint256 id, address proposer) external view returns (uint256 amount, bool proposed)",
];

const TOKEN_ABI: ethers.InterfaceAbi = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

let provider: ethers.JsonRpcProvider | null = null;

function getProvider() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(NETWORK.rpc);
  }
  return provider;
}

const STATE_MAP: Record<number, RetainerState> = {
  0: "Active",
  1: "Delivered",
  2: "Disputed",
  3: "Paid",
  4: "Resolved",
  5: "Reclaimed",
};

async function readCustos<T>(fn: string, args: unknown[]): Promise<T> {
  const contract = new ethers.Contract(CUSTOS_ADDRESS, CUSTOS_ABI, getProvider());
  const result = await contract[fn](...args);
  return result as T;
}

export async function getNextId(): Promise<bigint> {
  const id = await readCustos<bigint>("nextId", []);
  return id;
}

export async function getRetainer(id: number): Promise<Retainer | null> {
  const r = await readCustos<{
    client: string;
    freelancer: string;
    token: string;
    upfrontAmount: bigint;
    lockAmount: bigint;
    deliveryDeadline: bigint;
    approvalWindow: bigint;
    approvalDeadline: bigint;
    state: number;
  }>("getRetainer", [BigInt(id)]);

  if (!r || r.client === ethers.ZeroAddress) return null;

  return {
    id: BigInt(id),
    client: r.client,
    freelancer: r.freelancer,
    token: r.token,
    upfrontAmount: r.upfrontAmount,
    lockAmount: r.lockAmount,
    deliveryDeadline: Number(r.deliveryDeadline),
    approvalWindow: Number(r.approvalWindow),
    approvalDeadline: Number(r.approvalDeadline),
    state: STATE_MAP[r.state] ?? "Active",
  };
}

export async function getAllRetainers(): Promise<Retainer[]> {
  const next = await getNextId();
  const ids = Array.from({ length: Number(next) }, (_, i) => i);
  const results = await Promise.all(ids.map((id) => getRetainer(id)));
  return results.filter((r): r is Retainer => r !== null).reverse();
}

export async function getDisputeProposal(
  id: number,
  proposer: string
): Promise<bigint | null> {
  const result = await readCustos<{ amount: bigint; proposed: boolean }>(
    "getDisputeProposal",
    [BigInt(id), proposer]
  );
  if (!result.proposed) return null;
  return result.amount;
}

export async function getTokenBalance(who: string): Promise<bigint> {
  const contract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, getProvider());
  const bal = await contract.balanceOf(who);
  return bal;
}

export async function getBlockHeight(): Promise<number> {
  const provider = getProvider();
  const block = await provider.getBlockNumber();
  return block;
}
