;; mock-token-b.clar
;;
;; A SECOND SIP-010 token, used ONLY in local tests to verify that custos binds
;; each retainer to the token it was created with and rejects a *different*
;; valid SIP-010 token with ERR-WRONG-TOKEN. Not deployed to testnet.

(impl-trait 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sip-010-trait-ft-standard.sip-010-trait)

(define-fungible-token token-b)

(define-constant ERR-NOT-AUTHORIZED (err u1))

(define-public (transfer
    (amount uint)
    (sender principal)
    (recipient principal)
    (memo (optional (buff 34)))
  )
  (begin
    (asserts! (is-eq tx-sender sender) ERR-NOT-AUTHORIZED)
    (try! (ft-transfer? token-b amount sender recipient))
    (match memo to-print (print to-print) 0x)
    (ok true)
  )
)

(define-read-only (get-name) (ok "Mock Token B"))
(define-read-only (get-symbol) (ok "MTKB"))
(define-read-only (get-decimals) (ok u6))
(define-read-only (get-balance (who principal)) (ok (ft-get-balance token-b who)))
(define-read-only (get-total-supply) (ok (ft-get-supply token-b)))
(define-read-only (get-token-uri) (ok none))

(define-public (mint (amount uint) (recipient principal))
  (ft-mint? token-b amount recipient)
)
