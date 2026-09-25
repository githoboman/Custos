// Central config: network, deployed contracts, token. Everything on-chain
// flows through these constants so there is one place to change addresses.

export interface NetworkConfig {
  name: string;
  chainId: number;
  chainIdHex: string;
  rpc: string;
  explorer: string;
  custosAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
}

export const BOTCHAIN_MAINNET: NetworkConfig = {
  name: "BOT Chain Mainnet",
  chainId: 677,
  chainIdHex: "0x2a5",
  rpc: "https://rpc.botchain.ai",
  explorer: "https://scan.botchain.ai",
  custosAddress: "0xBcBcC1824c769802A7872bC0599764e83506c757",
  tokenAddress: "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C", // Official USDT on BOT Chain
  tokenSymbol: "USDT",
  tokenDecimals: 6,
};

export const BOTCHAIN_TESTNET: NetworkConfig = {
  name: "BOT Chain Testnet",
  chainId: 968,
  chainIdHex: "0x3c8",
  rpc: "https://rpc.bohr.life",
  explorer: "https://scan.bohr.life",
  custosAddress: "0x36038b726A0cB94E5e9544483B81dD48358df486",
  tokenAddress: "0xBcBcC1824c769802A7872bC0599764e83506c757", // Deployed tUSDC mock
  tokenSymbol: "tUSDC",
  tokenDecimals: 6,
};

// Default active network is Mainnet (Production)
export const NETWORK: NetworkConfig = BOTCHAIN_MAINNET;
export const NETWORK_NAME = "mainnet" as const;

export const CUSTOS_ADDRESS = NETWORK.custosAddress;
export const TOKEN_ADDRESS = NETWORK.tokenAddress;
export const TOKEN_SYMBOL = NETWORK.tokenSymbol;
export const TOKEN_DECIMALS = NETWORK.tokenDecimals;

export const EXPLORER = NETWORK.explorer;
export const explorerTx = (txid: string) => `${EXPLORER}/tx/${txid}`;
export const explorerAddress = (addr: string) => `${EXPLORER}/address/${addr}`;

export const APP_NAME = "Custos";
export const APP_ICON = "/shield.svg";
export const GITHUB_REPO = "https://github.com/githoboman/Custos";
export const BOTCHAIN_WEBSITE = "https://botchain.ai";
export const BOTCHAIN_EXPLORER = "https://scan.botchain.ai";
