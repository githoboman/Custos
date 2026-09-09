"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getAllRetainers,
  getBlockHeight,
  getTokenBalance,
} from "@/lib/custos-read";
import type { Retainer } from "@/lib/types";
import type { TxNotice } from "@/components/TxToast";

export function useRetainers() {
  const [retainers, setRetainers] = useState<Retainer[]>([]);
  const [block, setBlock] = useState(0);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState<TxNotice[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [rs, bh] = await Promise.all([getAllRetainers(), getBlockHeight()]);
      setRetainers(rs);
      setBlock(bh);
    } catch (e) {
      console.error("load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const refreshBalance = useCallback(async (address: string) => {
    try {
      const bal = await getTokenBalance(address);
      setBalance(bal);
    } catch {
      /* ignore */
    }
  }, []);

  const pushNotice = useCallback(
    (label: string, txId: string) => {
      setNotices((n) => [...n, { id: Date.now(), label, txId }]);
      setTimeout(refresh, 8000);
    },
    [refresh]
  );

  const dismiss = useCallback(
    (id: number) => setNotices((n) => (n.filter((x) => x.id !== id))),
    []
  );

  return { retainers, block, balance, loading, notices, refresh, refreshBalance, pushNotice, dismiss };
}
