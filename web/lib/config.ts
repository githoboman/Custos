// Central config: network, deployed contracts, token. Everything on-chain
// flows through these constants so there is one place to change addresses.

import { STACKS_TESTNET } from "@stacks/network";

export const NETWORK = STACKS_TESTNET;
export const NETWORK_NAME = "testnet" as const;

// Deployed Custos escrow contract (see CLAUDE.md).
export const CUSTOS_ADDRESS = "ST9NSDHK5969YF6WJ2MRCVVAVTDENWBNTFJRVZ3E";
export const CUSTOS_NAME = "custos";
export const CUSTOS_ID = `${CUSTOS_ADDRESS}.${CUSTOS_NAME}` as const;

// Token the retainer is denominated in.
//
// TESTING MODE: using the mintable test-usdcx so any wallet can be funded via
// the in-app "Mint" button. Real usdcx is Circle-bridge-only (no open mint,
// hard to move between wallets), which blocks two-wallet testing.
//
// For the FINAL DEMO, switch to the real usdcx (custos is token-agnostic and
// references the exact trait usdcx implements):
//   TOKEN_ADDRESS = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
//   TOKEN_NAME    = "usdcx"      TOKEN_SYMBOL = "USDCx"
export const TOKEN_ADDRESS = "ST9NSDHK5969YF6WJ2MRCVVAVTDENWBNTFJRVZ3E";
export const TOKEN_NAME = "test-usdcx";
export const TOKEN_ID = `${TOKEN_ADDRESS}.${TOKEN_NAME}` as const;
export const TOKEN_SYMBOL = "tUSDCx";
export const TOKEN_DECIMALS = 6;

// Real usdcx (for the final demo swap).
export const REAL_USDCX_ID =
  "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx" as const;

// FlowVault (upfront-split leg) — used for the create wizard's step 1.
export const FLOWVAULT_ADDRESS = "STD7QG84VQQ0C35SZM2EYTHZV4M8FQ0R7YNSQWPD";
export const FLOWVAULT_NAME = "flowvault-v2";

export const HIRO_API = "https://api.testnet.hiro.so";

export const EXPLORER = "https://explorer.hiro.so";
export const explorerTx = (txid: string) =>
  `${EXPLORER}/txid/${txid}?chain=${NETWORK_NAME}`;
export const explorerAddress = (addr: string) =>
  `${EXPLORER}/address/${addr}?chain=${NETWORK_NAME}`;

export const APP_NAME = "Custos";
export const APP_ICON = "/shield.svg";
