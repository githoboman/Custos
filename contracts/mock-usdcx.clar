;; mock-usdcx.clar
;;
;; Minimal SIP-010 fungible token used ONLY for local Clarinet/simnet tests.
;; The real usdcx contract (ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx)
;; cannot run in local simnet, so `custos` is tested against this stand-in.
;; This is NOT deployed to testnet.

(impl-trait 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sip-010-trait-ft-standard.sip-010-trait)

(define-fungible-token mock-usdcx)

(define-constant ERR-NOT-AUTHORIZED (err u1))

;; ---------- SIP-010 ----------

(define-public (transfer
    (amount uint)
    (sender principal)
    (recipient principal)
    (memo (optional (buff 34)))
  )
  (begin
    ;; only the owner of the funds may move them
    (asserts! (is-eq tx-sender sender) ERR-NOT-AUTHORIZED)
    (try! (ft-transfer? mock-usdcx amount sender recipient))
    (match memo to-print (print to-print) 0x)
    (ok true)
  )
)

(define-read-only (get-name)
  (ok "Mock USDCx")
)

(define-read-only (get-symbol)
  (ok "USDCx")
)

(define-read-only (get-decimals)
  (ok u6)
)

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance mock-usdcx who))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply mock-usdcx))
)

(define-read-only (get-token-uri)
  (ok none)
)

;; ---------- test helper ----------

;; Open mint, for test setup only. A real token would gate this.
(define-public (mint (amount uint) (recipient principal))
  (ft-mint? mock-usdcx amount recipient)
)
