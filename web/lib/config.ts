// Central config: network, deployed contracts, token. Everything on-chain
// flows through these constants so there is one place to change addresses.

export const BOTCHAIN_TESTNET = {
  name: "BOT Chain Testnet",
  chainId: 968,
  rpc: "https://rpc.bohr.life",
  explorer: "https://scan.bohr.life",
};

export const BOTCHAIN_MAINNET = {
  name: "BOT Chain Mainnet",
  chainId: 677,
  rpc: "https://rpc.botchain.ai",
  explorer: "https://scan.botchain.ai",
};

export const NETWORK = BOTCHAIN_TESTNET;
export const NETWORK_NAME = "testnet" as const;

// Placeholder addresses — replace with actual deployed addresses.
// The deploy script saves them to deployments/botchain-testnet.json.
export const CUSTOS_ADDRESS = "0x0000000000000000000000000000000000000000";
export const TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";
export const TOKEN_SYMBOL = "tUSDC";
export const TOKEN_DECIMALS = 6;

export const HIRO_API = "";

export const EXPLORER = NETWORK.explorer;
export const explorerTx = (txid: string) => `${EXPLORER}/tx/${txid}`;
export const explorerAddress = (addr: string) => `${EXPLORER}/address/${addr}`;

export const APP_NAME = "Custos";
export const APP_ICON = "/shield.svg";
