"use client";

import { useCallback, useEffect, useState } from "react";
import { BOTCHAIN_MAINNET, BOTCHAIN_TESTNET, NETWORK } from "@/lib/config";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

async function getAddress(): Promise<string | null> {
  if (typeof window === "undefined" || !window.ethereum) return null;
  try {
    const accounts = (await window.ethereum.request({
      method: "eth_accounts",
      params: [],
    })) as string[];
    return accounts[0] ?? null;
  } catch {
    return null;
  }
}

async function getChainId(): Promise<string | null> {
  if (typeof window === "undefined" || !window.ethereum) return null;
  try {
    const chainId = (await window.ethereum.request({
      method: "eth_chainId",
      params: [],
    })) as string;
    return chainId ?? null;
  } catch {
    return null;
  }
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const isMainnet = chainId === BOTCHAIN_MAINNET.chainIdHex || chainId === "0x2a5";
  const isTestnet = chainId === BOTCHAIN_TESTNET.chainIdHex || chainId === "0x3c8";
  const isBotChain = isMainnet || isTestnet;

  useEffect(() => {
    let alive = true;

    Promise.all([getAddress(), getChainId()]).then(([a, c]) => {
      if (alive) {
        setAddress(a);
        setChainId(c);
        setReady(true);
      }
    });

    const handleAccounts = (accounts: unknown) => {
      const accs = accounts as string[];
      if (alive) setAddress(accs[0] ?? null);
    };

    const handleChainChanged = (newChainId: unknown) => {
      if (alive) setChainId(newChainId as string);
    };

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccounts);
      window.ethereum.on("chainChanged", handleChainChanged);
    }

    return () => {
      alive = false;
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccounts);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  const switchNetwork = useCallback(async (targetChainHex: string = BOTCHAIN_MAINNET.chainIdHex) => {
    if (!window.ethereum) return;

    const isTargetMainnet = targetChainHex === BOTCHAIN_MAINNET.chainIdHex;
    const targetConfig = isTargetMainnet ? BOTCHAIN_MAINNET : BOTCHAIN_TESTNET;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetConfig.chainIdHex }],
      });
    } catch (switchError: unknown) {
      // 4902 error code indicates the chain has not been added to MetaMask
      if (
        typeof switchError === "object" &&
        switchError !== null &&
        "code" in switchError &&
        (switchError as { code: number }).code === 4902
      ) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: targetConfig.chainIdHex,
                chainName: targetConfig.name,
                rpcUrls: [targetConfig.rpc],
                nativeCurrency: {
                  name: "BOT",
                  symbol: "BOT",
                  decimals: 18,
                },
                blockExplorerUrls: [targetConfig.explorer],
              },
            ],
          });
        } catch (addError) {
          console.error("Failed to add BOT Chain to wallet:", addError);
        }
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      window.open("https://metamask.io/download/", "_blank");
      return;
    }
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
        params: [],
      })) as string[];
      setAddress(accounts[0] ?? null);

      const currentChain = await getChainId();
      setChainId(currentChain);

      // Auto-prompt switch if not on BOT Chain
      if (currentChain !== BOTCHAIN_MAINNET.chainIdHex && currentChain !== BOTCHAIN_TESTNET.chainIdHex) {
        await switchNetwork(BOTCHAIN_MAINNET.chainIdHex);
      }
    } catch (e) {
      console.warn("connect cancelled:", e);
    }
  }, [switchNetwork]);

  const disconnect = useCallback(() => {
    setAddress(null);
  }, []);

  return {
    address,
    chainId,
    isConnected: !!address,
    isBotChain,
    isMainnet,
    isTestnet,
    ready,
    connect,
    disconnect,
    switchNetwork,
  };
}
