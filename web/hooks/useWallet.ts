"use client";

import { useCallback, useEffect, useState } from "react";

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

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    getAddress().then((a) => {
      if (alive) {
        setAddress(a);
        setReady(true);
      }
    });

    const handleAccounts = (accounts: unknown) => {
      const accs = accounts as string[];
      if (alive) setAddress(accs[0] ?? null);
    };

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccounts);
    }

    return () => {
      alive = false;
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccounts);
      }
    };
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
    } catch (e) {
      console.warn("connect cancelled:", e);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
  }, []);

  return {
    address,
    isConnected: !!address,
    ready,
    connect,
    disconnect,
  };
}
