"use client";

import { useCallback, useEffect, useState } from "react";

// @stacks/connect v8 pulls in a large WalletConnect/Reown dependency chain.
// We import it LAZILY (dynamic import) so it never runs during SSR/hydration —
// only when the user actually reads or acts on their wallet. This avoids
// blank-page hydration crashes on production (Vercel).

async function stacksConnect() {
  return import("@stacks/connect");
}

async function readAddress(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const { isConnected, getLocalStorage } = await stacksConnect();
    if (!isConnected()) return null;
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
    let alive = true;
    readAddress().then((a) => {
      if (alive) {
        setAddress(a);
        setReady(true);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      const { connect: connectWallet } = await stacksConnect();
      // forceWalletSelect: always show the wallet chooser so the user picks
      // their Stacks wallet (Leather/Xverse) explicitly — otherwise another
      // injected provider (e.g. MetaMask) can get auto-selected and fail.
      await connectWallet({ forceWalletSelect: true });
      setAddress(await readAddress());
    } catch (e) {
      console.warn("connect cancelled:", e);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const { disconnect: disconnectWallet } = await stacksConnect();
      disconnectWallet();
    } catch {
      /* ignore */
    }
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
