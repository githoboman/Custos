;; test-usdcx.clar
;;
;; A public-mint SIP-010 token for END-TO-END testnet testing of custos, since
;; the real usdcx is Circle-bridge-only (no faucet/swap/open-mint on testnet).
;; Same trait as the real usdcx implements. Anyone can mint -- test token only.

(impl-trait 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sip-010-trait-ft-standard.sip-010-trait)

(define-fungible-token test-usdcx)

(define-constant ERR-NOT-AUTHORIZED (err u1))

(define-public (transfer
    (amount uint)
    (sender principal)
    (recipient principal)
    (memo (optional (buff 34)))
  )
  (begin
    (asserts! (is-eq tx-sender sender) ERR-NOT-AUTHORIZED)
    (try! (ft-transfer? test-usdcx amount sender recipient))
    (match memo to-print (print to-print) 0x)
    (ok true)
  )
)

(define-read-only (get-name) (ok "Test USDCx"))
(define-read-only (get-symbol) (ok "tUSDCx"))
(define-read-only (get-decimals) (ok u6))
(define-read-only (get-balance (who principal)) (ok (ft-get-balance test-usdcx who)))
(define-read-only (get-total-supply) (ok (ft-get-supply test-usdcx)))
(define-read-only (get-token-uri) (ok none))

;; Open mint -- test token only. Anyone can fund themselves.
(define-public (mint (amount uint) (recipient principal))
  (ft-mint? test-usdcx amount recipient)
)
