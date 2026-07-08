"use client";

import { useCallback, useEffect, useState } from "react";
import {
  connect as connectWallet,
  disconnect as disconnectWallet,
  isConnected as walletIsConnected,
  getLocalStorage,
} from "@stacks/connect";

// @stacks/connect v8: the modern request()-based flow that Xverse and current
// Leather actually implement. connect() opens the wallet, addresses are stored
// in localStorage (key "@stacks/connect"), and getLocalStorage() reads them.

function currentAddress(): string | null {
  try {
    if (!walletIsConnected()) return null;
    const data = getLocalStorage();
    return data?.addresses?.stx?.[0]?.address ?? null;
  } catch (e) {
    console.warn("wallet session read failed:", e);
    return null;
  }
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAddress(currentAddress());
    setReady(true);
  }, []);

  const connect = useCallback(async () => {
    try {
      // forceWalletSelect: always show the wallet chooser so the user picks
      // their Stacks wallet (Xverse/Leather) explicitly — otherwise another
      // injected provider (e.g. MetaMask) can get auto-selected and fail.
      // The choice is persisted, so later stx_callContract requests reuse it.
      await connectWallet({ forceWalletSelect: true });
      setAddress(currentAddress());
    } catch (e) {
      // user rejected / closed the modal — not an error worth surfacing
      console.warn("connect cancelled:", e);
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectWallet();
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
