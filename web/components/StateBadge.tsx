import type { RetainerState } from "@/lib/types";

export function StateBadge({ state }: { state: RetainerState }) {
  return <span className={`custos-badge custos-badge--${state}`}>{state}</span>;
}
