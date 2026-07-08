# Custos — Build Brief for Claude Code

## What this is

A freelance-retainer app with TWO contracts working together, built for the
FlowVault Builder Bounty (Zero Authority DAO, deadline 2026-07-08):

1. **flowvault-v2** (already deployed by FlowVault, not ours) — handles the
   *instant upfront split* to the freelancer. This is the leg FlowVault is
   actually good at: real, trustless, immediate.
2. **custos** (ours, contract below, written and tested — SIP-010
   port still required, see "MUST FIX BEFORE SHIPPING") — handles the
   *escrowed remainder*, with a full delivery-confirmation / approval /
   dispute / auto-release / abandonment state machine. This exists because
   flowvault-v2's `lock-amount` can only ever return to the depositor
   (`withdraw()` hardcodes `tx-sender` as both payer and payee) — there is
   no code path in FlowVault for locked funds to reach a third party.
   FlowVault genuinely cannot do real escrow, so this contract does the part
   FlowVault structurally can't.

Repo to build in/against: https://github.com/yashpunmiya/Flowvault
(reuse `flowvault-sdk` for the FlowVault leg; mirror the structure of
`examples/flowpay` and `examples/savings-vault` in that monorepo for the
Next.js app — same conventions: `components/`, `hooks/`, `lib/`, `app/`).

## Why this architecture, specifically

The bounty wants "real products and meaningful integrations, not simple
frontend wrappers." A contract that never calls `flowvault-sdk` isn't an
integration — it's a parallel product. Splitting the flow across both
contracts is what makes this a real integration: FlowVault handles the leg
it can genuinely guarantee (instant split), and `custos` handles
the leg FlowVault cannot do at all (conditional release to a third party).
That's a true, checkable claim about FlowVault's limits — which is also
what makes it a strong "security/documentation" submission, not just
"innovation."

---

## MUST FIX BEFORE SHIPPING — token mismatch — ✅ RESOLVED

> **Status: DONE.** `custos.clar` has been ported from STX to SIP-010/USDCx,
> re-tested (36/36 passing) against a local mock token under Clarity 3, and
> deployed to testnet at `ST9NSDHK5969YF6WJ2MRCVVAVTDENWBNTFJRVZ3E.custos`.
> The trait principal was confirmed (not guessed) from the deployed usdcx
> source as `...sip-010-trait-ft-standard.sip-010-trait`. The STX source and
> STX test suite further below are kept only as historical reference — the
> live code is in `contracts/` and `custos.test.ts`. Remaining gap: not yet
> exercised with real testnet USDCx end-to-end (real usdcx gates minting).

The original problem, for context:

`custos.clar` below was written and fully tested (33/33 passing),
but **only against native STX** (`stx-transfer?`). FlowVault's split leg
pays out in **USDCx (SIP-010)**. If the escrow leg still pays in STX, one
"retainer" ends up split across two different currencies — broken product
logic, not a cosmetic issue.

**Required before this can be submitted as a working product:**

1. Port every fund-moving function in `custos.clar`
   (`create-retainer`, `approve-and-release`, `auto-release`,
   `resolve-dispute`, `reclaim-abandoned`, and the `pay-out` helper) from
   `stx-transfer?` to a SIP-010 `transfer` call against a trait parameter,
   targeting the same USDCx testnet contract FlowVault uses:
   `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx`.
2. Add a `(token <ft-trait>)` parameter to each of those public functions,
   and call `(contract-call? token transfer amount sender recipient none)`
   instead of `stx-transfer?`.
3. **Confirm the exact SIP-010 trait principal that `usdcx` actually
   implements by reading the deployed contract or flowvault-v2's own trait
   import — do not guess it.** The trait principal must match exactly or
   the trait reference won't type-check.
4. For local Clarinet tests, deploy a minimal mock SIP-010 fungible-token
   contract alongside `custos` in `Clarinet.toml` (the real
   `usdcx` contract can't run in local simnet) — standard pattern:
   `define-fungible-token` + `mint`/`transfer`/`get-balance` implementing
   the trait.
5. Re-run the full test suite after the port. Balance assertions change
   from `simnet.getAssetsMap().get("STX")` to reading the FT balance map
   for the mock token. **The STX version passing 33/33 says nothing about
   whether the SIP-010 version is correct — verify it fresh, don't assume.**

Do this before frontend work. A broken token integration invalidates
everything built on top of it.

---

## Critical design constraint on flowvault-v2 (carried over, still true)

This only matters for correctly explaining *why* a second contract was
necessary — `custos` no longer routes anything through
flowvault-v2's `lock`, so this doesn't describe our own contract's
behavior, only FlowVault's:

- `split-address` receives funds **immediately at deposit time** — a real,
  instant payment to a third party.
- `lock-amount` is **not escrow**. It stays attached to the depositor.
  `withdraw()` hardcodes `tx-sender` as both the account debited and the
  payout recipient. There is no function that moves a locked balance to
  anyone but the depositor.

Never describe flowvault-v2's own `lock` as releasing to a third party —
it structurally can't. That's exactly the gap `custos` fills.

---

## custos.clar — state machine

```
active -----mark-delivered(freelancer, before delivery-deadline)----> delivered
active -----reclaim-abandoned(client, after delivery-deadline)------> reclaimed

delivered --approve-and-release(client)-----------------------------> paid
delivered --auto-release(anyone, after approval-deadline)-----------> paid
delivered --dispute(client, before approval-deadline)---------------> disputed

disputed ---resolve-dispute(client & freelancer submit matching
            freelancer-amount)---------------------------------------> resolved
```

- **Delivery confirmation** — only the freelancer can call `mark-delivered`,
  only before `delivery-deadline`.
- **Approval/dispute window** — once delivered, the client has
  `approval-window` blocks to `approve-and-release` or `dispute`.
- **Auto-release on silence** — after `approval-deadline`, *anyone* can call
  `auto-release` to pay the freelancer, so the client can't stall forever
  by doing nothing.
- **Mutual-consent dispute resolution** — both sides independently call
  `resolve-dispute` with a proposed `freelancer-amount`. It only executes
  once both proposals match exactly; mismatched or lone proposals are just
  recorded and wait.
- **Abandonment protection** — if the freelancer never delivers,
  `reclaim-abandoned` returns the full escrow to the client after
  `delivery-deadline`.

**Race handled deliberately:** `mark-delivered` hard-rejects after
`delivery-deadline`, so a late delivery and a client reclaim can't both
succeed — whichever transaction lands first is final, the other errors
cleanly.

**Deliberate limitation, not a bug:** if the two dispute proposals never
converge, the escrow sits frozen in `disputed` forever. There is no
arbitrator. State this plainly in the README — it's the real tradeoff of
trustless mutual-consent resolution.

**Also worth documenting honestly:** dispute proposals are stored on-chain
as soon as submitted, so they're publicly visible immediately — this is an
open back-and-forth negotiation (either side can "accept" the other's
outstanding proposal by matching it), not a sealed-bid mechanism.

Error codes: `u100` not-found · `u101` unauthorized · `u102` wrong state
(not active) · `u103` wrong state (not delivered) · `u104` wrong state
(not disputed) · `u105` zero-amount · `u106` client==freelancer · `u107`
zero delivery/approval window · `u108` auto-release too early · `u109`
delivery-deadline passed · `u110` delivery-deadline not yet reached ·
`u111` dispute window passed · `u112` split exceeds lock-amount.

## Full contract source (STX reference — port to SIP-010 per above before shipping)

```clarity
;; custos.clar
;;
;; Real (two-key) escrow for freelance retainers. Unlike flowvault-v2's
;; lock-amount (which can only ever return to the depositor), the escrowed
;; portion here can move to the freelancer -- either because the client
;; approved it, because the client went silent past the approval window, or
;; because both sides agreed on a split after a dispute.
;;
;; State machine per retainer:
;;
;;   active -----mark-delivered(freelancer)----> delivered
;;   active -----reclaim-abandoned(client, after delivery-deadline)---> reclaimed
;;
;;   delivered --approve-and-release(client)-----------------> paid
;;   delivered --auto-release(anyone, after approval-deadline)-> paid
;;   delivered --dispute(client, before approval-deadline)----> disputed
;;
;;   disputed ---resolve-dispute(client & freelancer submit matching
;;               freelancer-amount)-------------------------> resolved
;;
;; Known, deliberate limitation: if a dispute's two proposals never match,
;; funds stay frozen in "disputed" forever. There is no arbitrator in this
;; contract. That's a real tradeoff of trustless mutual-consent resolution,
;; not an oversight -- document it plainly rather than pretending it's solved.

;; ---------- errors ----------
(define-constant ERR-NOT-FOUND (err u100))
(define-constant ERR-UNAUTHORIZED (err u101))
(define-constant ERR-NOT-ACTIVE (err u102))
(define-constant ERR-NOT-DELIVERED (err u103))
(define-constant ERR-NOT-DISPUTED (err u104))
(define-constant ERR-ZERO-AMOUNT (err u105))
(define-constant ERR-INVALID-PARTIES (err u106))
(define-constant ERR-ZERO-DURATION (err u107))
(define-constant ERR-TOO-EARLY (err u108))
(define-constant ERR-DELIVERY-DEADLINE-PASSED (err u109))
(define-constant ERR-DELIVERY-DEADLINE-NOT-REACHED (err u110))
(define-constant ERR-DISPUTE-WINDOW-PASSED (err u111))
(define-constant ERR-INVALID-SPLIT (err u112))

;; ---------- state ----------
(define-data-var next-id uint u0)

(define-map retainers
  uint
  {
    client: principal,
    freelancer: principal,
    upfront-amount: uint,
    lock-amount: uint,
    delivery-deadline: uint,   ;; freelancer must mark-delivered by this height
    approval-window: uint,     ;; blocks the client gets to act after delivery
    approval-deadline: uint,   ;; set once delivered: delivered-height + approval-window
    state: (string-ascii 10)   ;; "active" "delivered" "disputed" "paid" "resolved" "reclaimed"
  }
)

;; proposer's suggested freelancer-amount for a disputed retainer
(define-map dispute-proposals { id: uint, proposer: principal } uint)

;; ---------- public functions ----------

;; Client creates and funds a retainer. upfront-amount pays the freelancer
;; immediately. lock-amount is held IN THIS CONTRACT (true escrow) until one
;; of the resolution paths below moves it.
(define-public (create-retainer
    (freelancer principal)
    (upfront-amount uint)
    (lock-amount uint)
    (delivery-window uint)
    (approval-window uint)
  )
  (let (
      (client tx-sender)
      (id (var-get next-id))
      (delivery-deadline (+ block-height delivery-window))
    )
    (asserts! (not (is-eq client freelancer)) ERR-INVALID-PARTIES)
    (asserts! (and (> delivery-window u0) (> approval-window u0)) ERR-ZERO-DURATION)
    (asserts! (> (+ upfront-amount lock-amount) u0) ERR-ZERO-AMOUNT)

    (if (> upfront-amount u0)
      (try! (stx-transfer? upfront-amount client freelancer))
      true
    )
    (if (> lock-amount u0)
      (try! (stx-transfer? lock-amount client (as-contract tx-sender)))
      true
    )

    (map-set retainers id {
      client: client,
      freelancer: freelancer,
      upfront-amount: upfront-amount,
      lock-amount: lock-amount,
      delivery-deadline: delivery-deadline,
      approval-window: approval-window,
      approval-deadline: u0,
      state: "active"
    })
    (var-set next-id (+ id u1))
    (ok id)
  )
)

;; Freelancer confirms delivery, before the delivery-deadline. Opens the
;; client's approval/dispute window.
(define-public (mark-delivered (id uint))
  (let ((r (unwrap! (map-get? retainers id) ERR-NOT-FOUND)))
    (asserts! (is-eq tx-sender (get freelancer r)) ERR-UNAUTHORIZED)
    (asserts! (is-eq (get state r) "active") ERR-NOT-ACTIVE)
    (asserts! (<= block-height (get delivery-deadline r)) ERR-DELIVERY-DEADLINE-PASSED)

    (map-set retainers id (merge r {
      state: "delivered",
      approval-deadline: (+ block-height (get approval-window r))
    }))
    (ok true)
  )
)

;; Client explicitly approves delivered work and releases the full
;; lock-amount to the freelancer right away.
(define-public (approve-and-release (id uint))
  (let ((r (unwrap! (map-get? retainers id) ERR-NOT-FOUND)))
    (asserts! (is-eq tx-sender (get client r)) ERR-UNAUTHORIZED)
    (asserts! (is-eq (get state r) "delivered") ERR-NOT-DELIVERED)

    (try! (pay-out id r (get freelancer r) (get lock-amount r)))
    (map-set retainers id (merge r { state: "paid" }))
    (ok true)
  )
)

;; Anyone can trigger this once the approval-deadline has passed without the
;; client approving or disputing -- prevents a client from stalling forever
;; by simply doing nothing.
(define-public (auto-release (id uint))
  (let ((r (unwrap! (map-get? retainers id) ERR-NOT-FOUND)))
    (asserts! (is-eq (get state r) "delivered") ERR-NOT-DELIVERED)
    (asserts! (> block-height (get approval-deadline r)) ERR-TOO-EARLY)

    (try! (pay-out id r (get freelancer r) (get lock-amount r)))
    (map-set retainers id (merge r { state: "paid" }))
    (ok true)
  )
)

;; Client disputes delivered work, before the approval-deadline. Freezes
;; funds until both sides submit a matching split via resolve-dispute.
(define-public (dispute (id uint))
  (let ((r (unwrap! (map-get? retainers id) ERR-NOT-FOUND)))
    (asserts! (is-eq tx-sender (get client r)) ERR-UNAUTHORIZED)
    (asserts! (is-eq (get state r) "delivered") ERR-NOT-DELIVERED)
    (asserts! (<= block-height (get approval-deadline r)) ERR-DISPUTE-WINDOW-PASSED)

    (map-set retainers id (merge r { state: "disputed" }))
    (ok true)
  )
)

;; Either party proposes how the lock-amount should be split
;; (freelancer-amount to the freelancer, the remainder back to the client).
;; Executes only once both parties have submitted the SAME freelancer-amount.
;; Returns (ok true) if it executed, (ok false) if the proposal was recorded
;; and is waiting on the other party.
(define-public (resolve-dispute (id uint) (freelancer-amount uint))
  (let ((r (unwrap! (map-get? retainers id) ERR-NOT-FOUND)))
    (asserts! (is-eq (get state r) "disputed") ERR-NOT-DISPUTED)
    (asserts!
      (or (is-eq tx-sender (get client r)) (is-eq tx-sender (get freelancer r)))
      ERR-UNAUTHORIZED
    )
    (asserts! (<= freelancer-amount (get lock-amount r)) ERR-INVALID-SPLIT)

    (map-set dispute-proposals { id: id, proposer: tx-sender } freelancer-amount)

    (let (
        (other-party (if (is-eq tx-sender (get client r)) (get freelancer r) (get client r)))
        (other-proposal (map-get? dispute-proposals { id: id, proposer: other-party }))
      )
      (if (is-eq other-proposal (some freelancer-amount))
        (let ((client-amount (- (get lock-amount r) freelancer-amount)))
          (try! (pay-out id r (get freelancer r) freelancer-amount))
          (try! (pay-out id r (get client r) client-amount))
          (map-set retainers id (merge r { state: "resolved" }))
          (ok true)
        )
        (ok false)
      )
    )
  )
)

;; Client reclaims the escrowed lock-amount if the freelancer never marked
;; the work delivered before the delivery-deadline.
(define-public (reclaim-abandoned (id uint))
  (let ((r (unwrap! (map-get? retainers id) ERR-NOT-FOUND)))
    (asserts! (is-eq tx-sender (get client r)) ERR-UNAUTHORIZED)
    (asserts! (is-eq (get state r) "active") ERR-NOT-ACTIVE)
    (asserts! (> block-height (get delivery-deadline r)) ERR-DELIVERY-DEADLINE-NOT-REACHED)

    (try! (pay-out id r (get client r) (get lock-amount r)))
    (map-set retainers id (merge r { state: "reclaimed" }))
    (ok true)
  )
)

;; ---------- private ----------

(define-private (pay-out
    (id uint)
    (r {
      client: principal,
      freelancer: principal,
      upfront-amount: uint,
      lock-amount: uint,
      delivery-deadline: uint,
      approval-window: uint,
      approval-deadline: uint,
      state: (string-ascii 10)
    })
    (recipient principal)
    (amount uint)
  )
  (if (> amount u0)
    (as-contract (stx-transfer? amount tx-sender recipient))
    (ok true)
  )
)

;; ---------- read-only ----------

(define-read-only (get-retainer (id uint))
  (map-get? retainers id)
)

(define-read-only (get-dispute-proposal (id uint) (proposer principal))
  (map-get? dispute-proposals { id: id, proposer: proposer })
)

(define-read-only (get-next-id)
  (var-get next-id)
)
```

## Test suite (STX reference, 33/33 passing — must be re-derived after the SIP-010 port)

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { initSimnet } from "@stacks/clarinet-sdk";
import { Cl } from "@stacks/transactions";

const CONTRACT = "custos";

let simnet: Awaited<ReturnType<typeof initSimnet>>;
let deployer: string, client: string, freelancer: string, stranger: string;

beforeEach(async () => {
  simnet = await initSimnet();
  const accounts = simnet.getAccounts();
  deployer = accounts.get("deployer")!;
  client = accounts.get("wallet_1")!;
  freelancer = accounts.get("wallet_2")!;
  stranger = accounts.get("wallet_3")!;
});

function create(opts: {
  freelancer: string;
  upfront: number;
  lock: number;
  deliveryWindow: number;
  approvalWindow: number;
  sender: string;
}) {
  return simnet.callPublicFn(
    CONTRACT,
    "create-retainer",
    [
      Cl.principal(opts.freelancer),
      Cl.uint(opts.upfront),
      Cl.uint(opts.lock),
      Cl.uint(opts.deliveryWindow),
      Cl.uint(opts.approvalWindow),
    ],
    opts.sender
  );
}

function markDelivered(id: number, sender: string) {
  return simnet.callPublicFn(CONTRACT, "mark-delivered", [Cl.uint(id)], sender);
}

function approve(id: number, sender: string) {
  return simnet.callPublicFn(CONTRACT, "approve-and-release", [Cl.uint(id)], sender);
}

function autoRelease(id: number, sender: string) {
  return simnet.callPublicFn(CONTRACT, "auto-release", [Cl.uint(id)], sender);
}

function disputeIt(id: number, sender: string) {
  return simnet.callPublicFn(CONTRACT, "dispute", [Cl.uint(id)], sender);
}

function resolve(id: number, freelancerAmount: number, sender: string) {
  return simnet.callPublicFn(
    CONTRACT,
    "resolve-dispute",
    [Cl.uint(id), Cl.uint(freelancerAmount)],
    sender
  );
}

function reclaimAbandoned(id: number, sender: string) {
  return simnet.callPublicFn(CONTRACT, "reclaim-abandoned", [Cl.uint(id)], sender);
}

function stxBalance(who: string): bigint {
  return simnet.getAssetsMap().get("STX")!.get(who) ?? 0n;
}

// Standard retainer used across most tests: 2000 upfront, 8000 escrowed,
// 10 blocks to deliver, 20 blocks for the client to act after delivery.
function createStandard() {
  return create({
    freelancer,
    upfront: 2000,
    lock: 8000,
    deliveryWindow: 10,
    approvalWindow: 20,
    sender: client,
  });
}

describe("create-retainer", () => {
  it("pays the upfront split immediately, escrows the rest in the contract", () => {
    const freelancerBefore = stxBalance(freelancer);
    const clientBefore = stxBalance(client);

    const { result } = createStandard();
    expect(result).toBeOk(Cl.uint(0));

    expect(stxBalance(freelancer)).toBe(freelancerBefore + 2000n);
    expect(stxBalance(client)).toBe(clientBefore - 10000n);
    expect(stxBalance(`${deployer}.${CONTRACT}`)).toBe(8000n);
  });

  it("rejects client == freelancer", () => {
    const { result } = create({
      freelancer: client,
      upfront: 100,
      lock: 100,
      deliveryWindow: 10,
      approvalWindow: 10,
      sender: client,
    });
    expect(result).toBeErr(Cl.uint(106));
  });

  it("rejects a zero delivery window or approval window", () => {
    const noDelivery = create({
      freelancer,
      upfront: 100,
      lock: 100,
      deliveryWindow: 0,
      approvalWindow: 10,
      sender: client,
    });
    expect(noDelivery.result).toBeErr(Cl.uint(107));

    const noApproval = create({
      freelancer,
      upfront: 100,
      lock: 100,
      deliveryWindow: 10,
      approvalWindow: 0,
      sender: client,
    });
    expect(noApproval.result).toBeErr(Cl.uint(107));
  });

  it("rejects a totally zero-value retainer", () => {
    const { result } = create({
      freelancer,
      upfront: 0,
      lock: 0,
      deliveryWindow: 10,
      approvalWindow: 10,
      sender: client,
    });
    expect(result).toBeErr(Cl.uint(105));
  });

  it("assigns sequential ids so a client can hold multiple concurrent retainers", () => {
    const first = createStandard();
    const second = create({
      freelancer: stranger,
      upfront: 100,
      lock: 100,
      deliveryWindow: 10,
      approvalWindow: 10,
      sender: client,
    });
    expect(first.result).toBeOk(Cl.uint(0));
    expect(second.result).toBeOk(Cl.uint(1));
  });
});

describe("mark-delivered", () => {
  beforeEach(() => {
    createStandard();
  });

  it("rejects delivery confirmation from anyone but the freelancer", () => {
    const { result } = markDelivered(0, stranger);
    expect(result).toBeErr(Cl.uint(101));
  });

  it("rejects delivery confirmation from the client themselves", () => {
    const { result } = markDelivered(0, client);
    expect(result).toBeErr(Cl.uint(101));
  });

  it("moves state to delivered and opens the approval window", () => {
    const { result } = markDelivered(0, freelancer);
    expect(result).toBeOk(Cl.bool(true));

    const { result: record } = simnet.callReadOnlyFn(
      CONTRACT,
      "get-retainer",
      [Cl.uint(0)],
      deployer
    );
    const tuple = (record as any).value.value;
    expect(tuple.state.value).toBe("delivered");
  });

  it("rejects delivery confirmation after the delivery-deadline", () => {
    simnet.mineEmptyBlocks(11);
    const { result } = markDelivered(0, freelancer);
    expect(result).toBeErr(Cl.uint(109));
  });

  it("rejects a second delivery confirmation on an already-delivered retainer", () => {
    markDelivered(0, freelancer);
    const { result } = markDelivered(0, freelancer);
    expect(result).toBeErr(Cl.uint(102));
  });
});

describe("approve-and-release", () => {
  beforeEach(() => {
    createStandard();
    markDelivered(0, freelancer);
  });

  it("rejects approval from anyone but the client", () => {
    const { result } = approve(0, freelancer);
    expect(result).toBeErr(Cl.uint(101));
  });

  it("pays the full lock-amount to the freelancer immediately on approval", () => {
    const before = stxBalance(freelancer);
    const { result } = approve(0, client);
    expect(result).toBeOk(Cl.bool(true));
    expect(stxBalance(freelancer)).toBe(before + 8000n);
    expect(stxBalance(`${deployer}.${CONTRACT}`)).toBe(0n);
  });

  it("rejects approval on a retainer that hasn't been delivered", () => {
    createStandard(); // id 1, never delivered
    const { result } = approve(1, client);
    expect(result).toBeErr(Cl.uint(103));
  });

  it("rejects a second approval on an already-paid retainer", () => {
    approve(0, client);
    const { result } = approve(0, client);
    expect(result).toBeErr(Cl.uint(103));
  });
});

describe("auto-release", () => {
  beforeEach(() => {
    createStandard();
    markDelivered(0, freelancer);
  });

  it("rejects auto-release before the approval-deadline", () => {
    const { result } = autoRelease(0, stranger);
    expect(result).toBeErr(Cl.uint(108));
  });

  it("pays the freelancer once the client has gone silent past the approval-deadline", () => {
    simnet.mineEmptyBlocks(21);
    const before = stxBalance(freelancer);
    // anyone can trigger it, not just the freelancer
    const { result } = autoRelease(0, stranger);
    expect(result).toBeOk(Cl.bool(true));
    expect(stxBalance(freelancer)).toBe(before + 8000n);
  });

  it("cannot be triggered once the client already approved", () => {
    approve(0, client);
    simnet.mineEmptyBlocks(21);
    const { result } = autoRelease(0, stranger);
    expect(result).toBeErr(Cl.uint(103));
  });

  it("cannot be triggered once the client has disputed", () => {
    disputeIt(0, client);
    simnet.mineEmptyBlocks(21);
    const { result } = autoRelease(0, stranger);
    expect(result).toBeErr(Cl.uint(103));
  });
});

describe("dispute", () => {
  beforeEach(() => {
    createStandard();
    markDelivered(0, freelancer);
  });

  it("rejects a dispute from anyone but the client", () => {
    const { result } = disputeIt(0, freelancer);
    expect(result).toBeErr(Cl.uint(101));
  });

  it("rejects a dispute after the approval-deadline has passed", () => {
    simnet.mineEmptyBlocks(21);
    const { result } = disputeIt(0, client);
    expect(result).toBeErr(Cl.uint(111));
  });

  it("freezes the retainer in disputed state, no funds move yet", () => {
    const before = stxBalance(freelancer);
    const { result } = disputeIt(0, client);
    expect(result).toBeOk(Cl.bool(true));
    expect(stxBalance(freelancer)).toBe(before);
    expect(stxBalance(`${deployer}.${CONTRACT}`)).toBe(8000n);
  });
});

describe("resolve-dispute", () => {
  beforeEach(() => {
    createStandard();
    markDelivered(0, freelancer);
    disputeIt(0, client);
  });

  it("records a lone proposal and waits for the other party", () => {
    const { result } = resolve(0, 6000, client);
    expect(result).toBeOk(Cl.bool(false));

    const { result: stored } = simnet.callReadOnlyFn(
      CONTRACT,
      "get-dispute-proposal",
      [Cl.uint(0), Cl.principal(client)],
      deployer
    );
    expect(stored).toBeSome(Cl.uint(6000));
  });

  it("executes the split once both parties propose the same freelancer-amount", () => {
    resolve(0, 6000, client);
    const freelancerBefore = stxBalance(freelancer);
    const clientBefore = stxBalance(client);

    const { result } = resolve(0, 6000, freelancer);
    expect(result).toBeOk(Cl.bool(true));

    expect(stxBalance(freelancer)).toBe(freelancerBefore + 6000n);
    expect(stxBalance(client)).toBe(clientBefore + 2000n); // 8000 - 6000 back to client
    expect(stxBalance(`${deployer}.${CONTRACT}`)).toBe(0n);
  });

  it("does not execute when proposals disagree, and stays frozen", () => {
    resolve(0, 6000, client);
    const { result } = resolve(0, 3000, freelancer);
    expect(result).toBeOk(Cl.bool(false));
    expect(stxBalance(`${deployer}.${CONTRACT}`)).toBe(8000n);
  });

  it("rejects a proposal from anyone other than the client or freelancer", () => {
    const { result } = resolve(0, 6000, stranger);
    expect(result).toBeErr(Cl.uint(101));
  });

  it("rejects a proposal exceeding the escrowed lock-amount", () => {
    const { result } = resolve(0, 9000, client);
    expect(result).toBeErr(Cl.uint(112));
  });

  it("rejects resolve-dispute on a retainer that isn't disputed", () => {
    createStandard(); // id 1, still active
    const { result } = resolve(1, 100, client);
    expect(result).toBeErr(Cl.uint(104));
  });

  it("supports a full-refund-to-client split (freelancer-amount = 0)", () => {
    resolve(0, 0, client);
    const clientBefore = stxBalance(client);
    const { result } = resolve(0, 0, freelancer);
    expect(result).toBeOk(Cl.bool(true));
    expect(stxBalance(client)).toBe(clientBefore + 8000n);
  });
});

describe("reclaim-abandoned", () => {
  beforeEach(() => {
    createStandard();
  });

  it("rejects reclaim before the delivery-deadline", () => {
    const { result } = reclaimAbandoned(0, client);
    expect(result).toBeErr(Cl.uint(110));
  });

  it("rejects reclaim from anyone but the client", () => {
    simnet.mineEmptyBlocks(11);
    const { result } = reclaimAbandoned(0, freelancer);
    expect(result).toBeErr(Cl.uint(101));
  });

  it("returns the lock-amount to the client once the freelancer never delivered in time", () => {
    simnet.mineEmptyBlocks(11);
    const before = stxBalance(client);
    const { result } = reclaimAbandoned(0, client);
    expect(result).toBeOk(Cl.bool(true));
    expect(stxBalance(client)).toBe(before + 8000n);
  });

  it("cannot be reclaimed once the freelancer already marked it delivered", () => {
    markDelivered(0, freelancer);
    simnet.mineEmptyBlocks(11);
    const { result } = reclaimAbandoned(0, client);
    expect(result).toBeErr(Cl.uint(102));
  });
});

describe("get-retainer", () => {
  it("returns none for an unknown id", () => {
    const { result } = simnet.callReadOnlyFn(
      CONTRACT,
      "get-retainer",
      [Cl.uint(0)],
      deployer
    );
    expect(result).toBeNone();
  });
});
```

### Project scaffolding for the tests above

```toml
# Clarinet.toml
[project]
name = "custos"
description = "True-escrow retainer contract: client-funded, freelancer-claimable via delivery/approval/dispute flow"
authors = []
telemetry = false
cache_dir = ".cache"

[contracts.custos]
path = "contracts/custos.clar"
clarity_version = 2
epoch = 2.5

[repl.analysis]
passes = ["check_checker"]

[repl.analysis.check_checker]
strict = false
trusted_sender = false
trusted_caller = false
callee_filter = false
```

```json
// package.json
{
  "name": "custos",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": { "test": "vitest run" },
  "devDependencies": {
    "@stacks/clarinet-sdk": "^3.21.0",
    "@stacks/transactions": "7.4.0",
    "vitest": "^2.1.4"
  }
}
```

Pin `@stacks/transactions` to exactly match whatever version is bundled
inside `@stacks/clarinet-sdk`'s own `node_modules` at install time. If npm
ends up with two different copies of `@stacks/transactions` (one top-level,
one nested inside `clarinet-sdk`), `Cl.principal()` / `Cl.uint()` etc. built
from the top-level copy will fail with `SerializationError: Unable to
serialize. Invalid Clarity Value` when passed into the SDK's internal
serializer — a dual-package hazard, not a code bug. Fix by installing the
exact version clarinet-sdk bundles so npm dedupes to one shared copy
(check `node_modules/@stacks/clarinet-sdk/node_modules/@stacks/transactions/package.json`
if npm hasn't already deduped it away).

```javascript
// vitest.config.js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./node_modules/@stacks/clarinet-sdk/vitest-helpers/src/clarityValuesMatchers.ts"],
    testTimeout: 30000,
  },
});
```

Note: use only `clarityValuesMatchers.ts` in `setupFiles`, not the SDK's
full `vitest.setup.ts` — that file expects a custom vitest environment
(`global.options.clarinet`) that isn't wired up by default and will throw
`Cannot read properties of undefined (reading 'clarinet')`. Calling
`initSimnet()` directly per-test (as in the suite above) works fine without it.

```toml
# settings/Devnet.toml — any valid mnemonics work for local simnet, these are test-only
[network]
name = "devnet"
deployment_fee_rate = 10

[accounts.deployer]
mnemonic = "twice kind fence tip hidden tilt action fragile skin nothing glory cousin green tomorrow spring wrist shed math olympic multiply hip blue scout claw"
balance = 100_000_000_000_000

[accounts.wallet_1]
mnemonic = "sell invite acquire kitten bamboo drastic jelly vivid peace spawn twice guilt pave pen trash pretty park cube fragile unaware remain midnight betray rebuild"
balance = 100_000_000_000_000

[accounts.wallet_2]
mnemonic = "hold excess usual excess ring elephant install account glad dry fragile donkey gaze humble truck breeze nation gasp vacuum limb head keep delay hospital"
balance = 100_000_000_000_000

[accounts.wallet_3]
mnemonic = "cycle puppy glare enroll cost improve round trend wrist mushroom scorpion tower claim oppose clever elephant dinosaur eight problem before frozen dune wagon high"
balance = 100_000_000_000_000
```

---

## Frontend flow (Next.js, mirroring flowpay/savings-vault conventions)

### 1. Client creates a retainer — TWO signed transactions, shown as two explicit steps, never hidden behind one button

- Connect wallet (Leather/Xverse via Stacks Connect — reuse `useStacksWallet`
  hook pattern from the example apps).
- Form inputs: freelancer address, total amount, upfront %, delivery window
  (blocks), approval window (blocks).
- On submit, a 2-step wizard/progress UI:
  1. "Paying the signing bonus via FlowVault" — call `flowvault-sdk`'s
     `setRoutingRules()` then `deposit()` with `split-address = freelancer`,
     `split-amount = upfront`, `lock-amount = 0`.
  2. "Locking the retainer in escrow" — call `custos`'s
     `create-retainer()` with `upfront-amount = 0` (already paid via
     FlowVault above) and the full `lock-amount`.

### 2. Freelancer views the retainer

- Needs the client address + retainer id, not just the client address —
  `custos` supports multiple concurrent ids per client, so a
  shareable link should embed both.
- Reads `custos`'s `get-retainer(id)` for authoritative status:
  `state`, `delivery-deadline`, `approval-deadline`, `lock-amount`.
- FlowVault's `getVaultState(clientAddress)` is optional/informational only
  now — the authoritative state lives in `custos`.

### 3. Freelancer marks work delivered

- Calls `mark-delivered(id)` before `delivery-deadline`.
- UI should show a clear countdown and warn as `delivery-deadline`
  approaches — miss it and the client can reclaim everything.

### 4. Client responds within the approval window — three distinct actions

- Approve & release (`approve-and-release`) → freelancer paid in full,
  immediately.
- Dispute (`dispute`) → freezes funds, opens the resolution flow below.
- Do nothing → after `approval-deadline`, anyone can call `auto-release`
  (ideally the freelancer, or a keeper/bot — see Open Decisions).

### 5. Dispute resolution (only if disputed)

- Both parties independently call `resolve-dispute(id, freelancer-amount)`
  with their proposed split.
- Since proposals are public on-chain immediately, the UI can and should
  show whether the other party has already proposed (`get-dispute-proposal`
  is a read-only call) — frame this honestly as an open negotiation, not a
  blind/sealed vote.
- Once both proposals match, funds move automatically in that same
  transaction.

---

## Tech stack

- Next.js (App Router) + TypeScript, matching the FlowVault monorepo's
  existing apps
- `flowvault-sdk` for the upfront-split leg only
- Direct `@stacks/transactions` contract calls (or a small custom wrapper)
  for `custos` — it's not part of the FlowVault SDK
- Stacks Connect for wallet auth
- Testnet only for the submission
- Contract/token addresses:
  - FlowVault v2: `STD7QG84VQQ0C35SZM2EYTHZV4M8FQ0R7YNSQWPD.flowvault-v2`
  - USDCx (testnet): `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx`
  - SIP-010 trait (the one usdcx actually implements, confirmed from the
    deployed usdcx source — NOT guessed):
    `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sip-010-trait-ft-standard.sip-010-trait`
  - `custos`: **DEPLOYED to testnet** at
    `ST9NSDHK5969YF6WJ2MRCVVAVTDENWBNTFJRVZ3E.custos`
    (Clarity 3 / epoch 3.1, deploy tx
    `0x643ce6c8c55c3b5b2b3bff556f89cde20e79e0b71e81e16432c2609fc742ba35`,
    block 4027728). References the real SIP-010 trait above with no remap.

## Known limitations (state plainly in the README — don't oversell)

- Two separate client-signed transactions to create one retainer (FlowVault
  split + escrow lock) — not atomic, by design, both disclosed as
  sequential steps in the UI.
- Dispute resolution has no arbitrator. If proposals never match, funds
  stay frozen in `disputed` permanently — a deliberate trustless
  mutual-consent tradeoff, not an oversight.
- Dispute proposals are visible on-chain the moment they're submitted — an
  open negotiation, not a sealed-bid mechanism.
- `auto-release` is permissionless — intentional, prevents client
  stalling, but the caller pays their own gas with no guaranteed refund.
- Escrow leg is currently only verified against native STX. It cannot
  honestly be called a working USDCx product until the SIP-010 port above
  is done and re-tested.

## Open decisions

- [ ] Exact upfront % default — configurable or fixed?
- [ ] Delivery window / approval window: expose as raw block counts, or a
      friendlier days/date picker translated to blocks under the hood?
- [ ] Who calls `auto-release` in practice — rely on the freelancer noticing
      the deadline passed, or run a keeper/bot?
- [ ] Confirm the exact SIP-010 trait principal `usdcx` implements before
      writing the trait import (see "MUST FIX BEFORE SHIPPING" step 3)
- [ ] Project/repo name for submission (currently placeholder:
      `custos`)

## Bounty submission checklist

- [x] Port `custos.clar` to SIP-010/USDCx, re-verify full test
      suite against a local mock token — DONE (36/36 passing, Clarity 3;
      trait confirmed as `...sip-010-trait-ft-standard.sip-010-trait`)
- [x] Deploy `custos` to testnet, record the contract address above —
      DONE at `ST9NSDHK5969YF6WJ2MRCVVAVTDENWBNTFJRVZ3E.custos`.
- [x] Live end-to-end run on the DEPLOYED contract — DONE. Real testnet
      usdcx is Circle-bridge-only (no faucet/swap/open-mint), so a mintable
      test token `ST9NSDHK5969YF6WJ2MRCVVAVTDENWBNTFJRVZ3E.test-usdcx`
      (source in `contracts/test-usdcx.clar`, NOT a submission contract) was
      deployed and used to drive the full lifecycle on-chain:
      create-retainer (2000 upfront paid instantly + 8000 escrowed in the
      contract) -> mark-delivered -> approve-and-release (8000 released).
      Verified on-chain: freelancer received 10000, escrow drained to 0.
      For the demo, swap `test-usdcx` for the real usdcx principal (the
      contract is token-agnostic; it takes the token as a trait parameter).
- [ ] Submit via the official form on flow-vault.dev (not just a GitHub link)
- [ ] Confirm submission on the Zero Authority DAO bounty page
- [ ] Join the mandatory Telegram community
- [ ] Double-check testnet contract/token addresses against the live repo
      before demo-recording, in case they've changed since this brief was
      written
