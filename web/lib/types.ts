// Shared domain types mirroring the on-chain custos retainer.

export type RetainerState =
  | "active"
  | "delivered"
  | "disputed"
  | "paid"
  | "resolved"
  | "reclaimed";

export interface Retainer {
  id: number;
  client: string;
  freelancer: string;
  token: string; // token contract principal this retainer is denominated in
  upfrontAmount: bigint;
  lockAmount: bigint;
  deliveryDeadline: number; // stacks block height
  approvalWindow: number;
  approvalDeadline: number; // 0 until delivered
  state: RetainerState;
}

// Error codes from custos.clar, for turning contract errors into messages.
export const CUSTOS_ERRORS: Record<number, string> = {
  100: "Retainer not found",
  101: "Not authorized for this action",
  102: "Retainer is not active",
  103: "Retainer has not been delivered",
  104: "Retainer is not disputed",
  105: "Amount must be greater than zero",
  106: "Client and freelancer must differ",
  107: "Delivery and approval windows must be greater than zero",
  108: "Too early — the approval deadline has not passed",
  109: "The delivery deadline has already passed",
  110: "The delivery deadline has not been reached yet",
  111: "The dispute window has already closed",
  112: "Proposed split exceeds the escrowed amount",
  113: "Wrong token for this retainer",
};
