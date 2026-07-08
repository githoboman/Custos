// The brain that removes the "hidden button" problem: given a retainer, the
// viewer, and the current block height, return the single most relevant next
// action AND a plain-English explanation of the situation. Both the dashboard
// card hint and the detail page use this, so guidance is always consistent.

import type { Retainer } from "./types";
import { formatAmount } from "./format";
import { TOKEN_SYMBOL } from "./config";

export type ActionKind =
  | "mark-delivered"
  | "approve-and-release"
  | "auto-release"
  | "dispute"
  | "resolve-dispute"
  | "reclaim-abandoned"
  | "none";

export interface NextAction {
  kind: ActionKind;
  label: string; // button text, e.g. "Approve & release 8,000 tUSDCx"
  headline: string; // one-line status, e.g. "Waiting on you to approve"
  detail: string; // plain-English explanation of what happens
  role: "client" | "freelancer" | "anyone" | "observer";
  primary: boolean; // is this THE action, or a secondary/neutral state
  danger?: boolean;
}

export function nextAction(
  r: Retainer,
  viewer: string | null,
  block: number
): NextAction {
  const isClient = !!viewer && viewer === r.client;
  const isFreelancer = !!viewer && viewer === r.freelancer;
  const amt = `${formatAmount(r.lockAmount)} ${TOKEN_SYMBOL}`;
  const deliveryLeft = r.deliveryDeadline - block;
  const approvalLeft = r.approvalDeadline - block;

  // ---- active ----
  if (r.state === "active") {
    if (isFreelancer && deliveryLeft > 0)
      return {
        kind: "mark-delivered",
        label: "Mark work delivered",
        headline: "Your move — confirm delivery",
        detail:
          "You're the freelancer. Confirm you've delivered the work to open the client's approval window. Do this before the delivery deadline.",
        role: "freelancer",
        primary: true,
      };
    if (isClient && deliveryLeft <= 0)
      return {
        kind: "reclaim-abandoned",
        label: `Reclaim ${amt}`,
        headline: "Delivery deadline passed — reclaim your escrow",
        detail:
          "The freelancer never marked the work delivered before the deadline. You can reclaim the full escrowed amount.",
        role: "client",
        primary: true,
      };
    if (isClient)
      return {
        kind: "none",
        label: "",
        headline: "Waiting on the freelancer to deliver",
        detail: `You've funded the escrow. The freelancer has ${deliveryLeft} blocks to mark the work delivered.`,
        role: "client",
        primary: false,
      };
    if (isFreelancer)
      return {
        kind: "none",
        label: "",
        headline: "Delivery window has closed",
        detail:
          "The delivery deadline passed. The client can now reclaim the escrow.",
        role: "freelancer",
        primary: false,
      };
    return observer("Active — awaiting delivery from the freelancer.");
  }

  // ---- delivered ----
  if (r.state === "delivered") {
    if (isClient && approvalLeft > 0)
      return {
        kind: "approve-and-release",
        label: `Approve & release ${amt}`,
        headline: "The freelancer delivered — your move",
        detail: `Release the escrowed ${amt} to the freelancer, or dispute if the work isn't right. You have ${approvalLeft} blocks before anyone can trigger auto-release.`,
        role: "client",
        primary: true,
      };
    if (approvalLeft <= 0)
      return {
        kind: "auto-release",
        label: `Release ${amt} to freelancer`,
        headline: "Approval window closed — anyone can release",
        detail:
          "The client didn't act in time. Anyone can now trigger the release of the escrow to the freelancer. (You pay the gas.)",
        role: "anyone",
        primary: true,
      };
    if (isFreelancer)
      return {
        kind: "none",
        label: "",
        headline: "Waiting on the client to approve",
        detail: `You've delivered. The client has ${approvalLeft} blocks to approve or dispute. After that, anyone can trigger auto-release to pay you.`,
        role: "freelancer",
        primary: false,
      };
    return observer("Delivered — awaiting the client's approval.");
  }

  // ---- disputed ----
  if (r.state === "disputed") {
    if (isClient || isFreelancer)
      return {
        kind: "resolve-dispute",
        label: "Propose a split",
        headline: "Disputed — propose how to split the escrow",
        detail:
          "Both sides independently propose an amount for the freelancer. The split executes automatically once both proposals match exactly. Proposals are public on-chain.",
        role: isClient ? "client" : "freelancer",
        primary: true,
      };
    return observer("Disputed — the two parties are negotiating a split.");
  }

  // ---- terminal states ----
  if (r.state === "paid")
    return terminal("Paid", "The escrow was released to the freelancer.");
  if (r.state === "resolved")
    return terminal("Resolved", "The dispute was settled with an agreed split.");
  if (r.state === "reclaimed")
    return terminal(
      "Reclaimed",
      "The freelancer never delivered; the escrow returned to the client."
    );

  return observer("");
}

function observer(detail: string): NextAction {
  return {
    kind: "none",
    label: "",
    headline: "Nothing for you to do here",
    detail,
    role: "observer",
    primary: false,
  };
}

function terminal(headline: string, detail: string): NextAction {
  return { kind: "none", label: "", headline, detail, role: "observer", primary: false };
}
