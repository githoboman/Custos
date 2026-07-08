"use client";

import { useCallback, useEffect, useState } from "react";
import { getAllRetainers, getBlockHeight, getTokenBalance } from "@/lib/custos-read";
import { CUSTOS_ID } from "@/lib/config";
import type { Retainer } from "@/lib/types";
import type { TxNotice } from "@/components/TxToast";

// Shared data loader used by both role spaces: all retainers, current block,
// and (if connected) the viewer's token balance. Returns a refresh() and a
// pushNotice() that auto-refreshes after a tx has had time to confirm.
export function useRetainers(address: string | null) {
  const [retainers, setRetainers] = useState<Retainer[]>([]);
  const [block, setBlock] = useState(0);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState<TxNotice[]>([]);

  const sender = address ?? CUSTOS_ID.split(".")[0];

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [rs, bh] = await Promise.all([getAllRetainers(sender), getBlockHeight()]);
      setRetainers(rs);
      setBlock(bh);
      if (address) setBalance(await getTokenBalance(address));
    } catch (e) {
      console.error("load failed", e);
    } finally {
      setLoading(false);
    }
  }, [sender, address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pushNotice = useCallback(
    (label: string, txId: string) => {
      setNotices((n) => [...n, { id: Date.now(), label, txId }]);
      setTimeout(refresh, 8000);
    },
    [refresh]
  );

  const dismiss = useCallback(
    (id: number) => setNotices((n) => n.filter((x) => x.id !== id)),
    []
  );

  return { retainers, block, balance, loading, notices, refresh, pushNotice, dismiss };
}
