;; custos.clar
;;
;; Real (two-key) escrow for freelance retainers, denominated in a SIP-010
;; fungible token (USDCx on testnet). Unlike flowvault-v2's lock-amount
;; (which can only ever return to the depositor), the escrowed portion here
;; can move to the freelancer -- either because the client approved it,
;; because the client went silent past the approval window, or because both
;; sides agreed on a split after a dispute.
;;
;; Token: every fund-moving function takes a `token` trait parameter and calls
;; the SIP-010 `transfer`, instead of moving native STX. On testnet this must
;; be invoked with ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx (the same
;; token FlowVault's split leg pays out in). The token principal is recorded
;; per-retainer so later calls can be checked against the one used at creation.
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

(use-trait ft-trait 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sip-010-trait-ft-standard.sip-010-trait)

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
(define-constant ERR-WRONG-TOKEN (err u113))

;; ---------- state ----------
(define-data-var next-id uint u0)

(define-map retainers
  uint
  {
    client: principal,
    freelancer: principal,
    token: principal,          ;; SIP-010 contract this retainer is denominated in
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
;; of the resolution paths below moves it. All amounts are in `token`.
(define-public (create-retainer
    (token <ft-trait>)
    (freelancer principal)
    (upfront-amount uint)
    (lock-amount uint)
    (delivery-window uint)
    (approval-window uint)
  )
  (let (
      (client tx-sender)
      (id (var-get next-id))
      (delivery-deadline (+ stacks-block-height delivery-window))
    )
    (asserts! (not (is-eq client freelancer)) ERR-INVALID-PARTIES)
    (asserts! (and (> delivery-window u0) (> approval-window u0)) ERR-ZERO-DURATION)
    (asserts! (> (+ upfront-amount lock-amount) u0) ERR-ZERO-AMOUNT)

    (if (> upfront-amount u0)
      (try! (contract-call? token transfer upfront-amount client freelancer none))
      true
    )
    (if (> lock-amount u0)
      (try! (contract-call? token transfer lock-amount client (as-contract tx-sender) none))
      true
    )

    (map-set retainers id {
      client: client,
      freelancer: freelancer,
      token: (contract-of token),
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
    (asserts! (<= stacks-block-height (get delivery-deadline r)) ERR-DELIVERY-DEADLINE-PASSED)

    (map-set retainers id (merge r {
      state: "delivered",
      approval-deadline: (+ stacks-block-height (get approval-window r))
    }))
    (ok true)
  )
)

;; Client explicitly approves delivered work and releases the full
;; lock-amount to the freelancer right away.
(define-public (approve-and-release (id uint) (token <ft-trait>))
  (let ((r (unwrap! (map-get? retainers id) ERR-NOT-FOUND)))
    (asserts! (is-eq tx-sender (get client r)) ERR-UNAUTHORIZED)
    (asserts! (is-eq (get state r) "delivered") ERR-NOT-DELIVERED)
    (asserts! (is-eq (contract-of token) (get token r)) ERR-WRONG-TOKEN)

    (try! (pay-out token (get freelancer r) (get lock-amount r)))
    (map-set retainers id (merge r { state: "paid" }))
    (ok true)
  )
)

;; Anyone can trigger this once the approval-deadline has passed without the
;; client approving or disputing -- prevents a client from stalling forever
;; by simply doing nothing.
(define-public (auto-release (id uint) (token <ft-trait>))
  (let ((r (unwrap! (map-get? retainers id) ERR-NOT-FOUND)))
    (asserts! (is-eq (get state r) "delivered") ERR-NOT-DELIVERED)
    (asserts! (> stacks-block-height (get approval-deadline r)) ERR-TOO-EARLY)
    (asserts! (is-eq (contract-of token) (get token r)) ERR-WRONG-TOKEN)

    (try! (pay-out token (get freelancer r) (get lock-amount r)))
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
    (asserts! (<= stacks-block-height (get approval-deadline r)) ERR-DISPUTE-WINDOW-PASSED)

    (map-set retainers id (merge r { state: "disputed" }))
    (ok true)
  )
)

;; Either party proposes how the lock-amount should be split
;; (freelancer-amount to the freelancer, the remainder back to the client).
;; Executes only once both parties have submitted the SAME freelancer-amount.
;; Returns (ok true) if it executed, (ok false) if the proposal was recorded
;; and is waiting on the other party.
(define-public (resolve-dispute (id uint) (freelancer-amount uint) (token <ft-trait>))
  (let ((r (unwrap! (map-get? retainers id) ERR-NOT-FOUND)))
    (asserts! (is-eq (get state r) "disputed") ERR-NOT-DISPUTED)
    (asserts!
      (or (is-eq tx-sender (get client r)) (is-eq tx-sender (get freelancer r)))
      ERR-UNAUTHORIZED
    )
    (asserts! (<= freelancer-amount (get lock-amount r)) ERR-INVALID-SPLIT)
    (asserts! (is-eq (contract-of token) (get token r)) ERR-WRONG-TOKEN)

    (map-set dispute-proposals { id: id, proposer: tx-sender } freelancer-amount)

    (let (
        (other-party (if (is-eq tx-sender (get client r)) (get freelancer r) (get client r)))
        (other-proposal (map-get? dispute-proposals { id: id, proposer: other-party }))
      )
      (if (is-eq other-proposal (some freelancer-amount))
        (let ((client-amount (- (get lock-amount r) freelancer-amount)))
          (try! (pay-out token (get freelancer r) freelancer-amount))
          (try! (pay-out token (get client r) client-amount))
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
(define-public (reclaim-abandoned (id uint) (token <ft-trait>))
  (let ((r (unwrap! (map-get? retainers id) ERR-NOT-FOUND)))
    (asserts! (is-eq tx-sender (get client r)) ERR-UNAUTHORIZED)
    (asserts! (is-eq (get state r) "active") ERR-NOT-ACTIVE)
    (asserts! (> stacks-block-height (get delivery-deadline r)) ERR-DELIVERY-DEADLINE-NOT-REACHED)
    (asserts! (is-eq (contract-of token) (get token r)) ERR-WRONG-TOKEN)

    (try! (pay-out token (get client r) (get lock-amount r)))
    (map-set retainers id (merge r { state: "reclaimed" }))
    (ok true)
  )
)

;; ---------- private ----------

;; Moves escrowed tokens out of the contract to `recipient`. Runs as the
;; contract principal so the SIP-010 transfer's sender == the contract.
(define-private (pay-out
    (token <ft-trait>)
    (recipient principal)
    (amount uint)
  )
  (if (> amount u0)
    (as-contract (contract-call? token transfer amount tx-sender recipient none))
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
