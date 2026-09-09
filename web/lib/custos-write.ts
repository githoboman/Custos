"use client";

import { ethers } from "ethers";
import { CUSTOS_ADDRESS, TOKEN_ADDRESS, NETWORK_NAME, NETWORK } from "./config";

type OnFinish = (txId: string) => void;

const CUSTOS_ABI: ethers.InterfaceAbi = [
  "function createRetainer(address token, address freelancer, uint256 upfrontAmount, uint256 lockAmount, uint256 deliveryWindow, uint256 approvalWindow) external returns (uint256)",
  "function markDelivered(uint256 id) external",
  "function approveAndRelease(uint256 id) external",
  "function autoRelease(uint256 id) external",
  "function dispute(uint256 id) external",
  "function resolveDispute(uint256 id, uint256 freelancerAmount) external returns (bool)",
  "function reclaimAbandoned(uint256 id) external",
];

const TOKEN_ABI: ethers.InterfaceAbi = [
  "function transferFrom(address from, address to, uint256 value) external returns (bool)",
  "function mint(address to, uint256 amount) external",
];

async function getSigner() {
  if (!window.ethereum) throw new Error("No wallet found");
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  return await provider.getSigner();
}

async function sendTx(
  contractAddress: string,
  abi: ethers.InterfaceAbi,
  fn: string,
  args: unknown[],
  onFinish?: OnFinish,
  onCancel?: () => void
) {
  try {
    const signer = await getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);
    const tx = await contract[fn](...args);
    const receipt = await tx.wait();
    if (receipt && typeof receipt === "object" && "hash" in receipt) {
      onFinish?.((receipt as { hash: string }).hash);
    } else {
      onCancel?.();
    }
  } catch (e) {
    console.warn(`${fn} cancelled/failed:`, e);
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
  sendTx(
    CUSTOS_ADDRESS,
    CUSTOS_ABI,
    "createRetainer",
    [TOKEN_ADDRESS, args.freelancer, args.upfront, args.lock, args.deliveryWindow, args.approvalWindow],
    onFinish,
    onCancel
  );
}

export function markDelivered(id: number, onFinish?: OnFinish, onCancel?: () => void) {
  sendTx(CUSTOS_ADDRESS, CUSTOS_ABI, "markDelivered", [BigInt(id)], onFinish, onCancel);
}

export function approveAndRelease(id: number, onFinish?: OnFinish, onCancel?: () => void) {
  sendTx(CUSTOS_ADDRESS, CUSTOS_ABI, "approveAndRelease", [BigInt(id)], onFinish, onCancel);
}

export function autoRelease(id: number, onFinish?: OnFinish, onCancel?: () => void) {
  sendTx(CUSTOS_ADDRESS, CUSTOS_ABI, "autoRelease", [BigInt(id)], onFinish, onCancel);
}

export function dispute(id: number, onFinish?: OnFinish, onCancel?: () => void) {
  sendTx(CUSTOS_ADDRESS, CUSTOS_ABI, "dispute", [BigInt(id)], onFinish, onCancel);
}

export function resolveDispute(
  id: number,
  freelancerAmount: bigint,
  onFinish?: OnFinish,
  onCancel?: () => void
) {
  sendTx(
    CUSTOS_ADDRESS,
    CUSTOS_ABI,
    "resolveDispute",
    [BigInt(id), freelancerAmount],
    onFinish,
    onCancel
  );
}

export function reclaimAbandoned(id: number, onFinish?: OnFinish, onCancel?: () => void) {
  sendTx(CUSTOS_ADDRESS, CUSTOS_ABI, "reclaimAbandoned", [BigInt(id)], onFinish, onCancel);
}

export function mintTestTokens(amount: bigint, recipient: string, onFinish?: OnFinish) {
  sendTx(TOKEN_ADDRESS, TOKEN_ABI, "mint", [recipient, amount], onFinish);
}
