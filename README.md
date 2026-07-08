# Custos

**Real escrow for freelance retainers, on Stacks.** Held safe until it's meant to move.

Custos splits a freelance retainer into two legs that work together:

1. **Signing bonus** — paid to the freelancer *instantly* at hire time (via
   [FlowVault](https://github.com/yashpunmiya/Flowvault)'s trustless split).
2. **Escrowed balance** — held in *true* on-chain escrow by the `custos`
   contract and released only when it should be: on client approval, on
   auto-release if the client goes silent, or by a mutually-agreed split after
   a dispute.

The escrow leg exists because FlowVault's `lock-amount` can only ever return to
the depositor — its `withdraw()` hardcodes `tx-sender` as both payer and payee,
so there is no code path for locked funds to reach a third party. FlowVault
genuinely cannot do third-party escrow; `custos` does exactly the part FlowVault
structurally can't, while reusing FlowVault for the instant split it *is* good
at. That's the integration.

---

## Status

| | |
|---|---|
| Contract | **deployed to testnet** — `ST9NSDHK5969YF6WJ2MRCVVAVTDENWBNTFJRVZ3E.custos` |
| Token | SIP-010 (USDCx on production). Denominated per-retainer; contract is token-agnostic. |
| Tests | **36/36 passing** (Clarinet simnet, against a mock SIP-010 token) |
| End-to-end | verified on the **deployed** contract with a mintable test token — create → deliver → approve moved real on-chain balances |
| Frontend | Next.js app in [`web/`](web/) — dashboard + hire flow, wired to the deployed contract |

## The retainer state machine

```
active ----mark-delivered(freelancer, before delivery-deadline)---> delivered
active ----reclaim-abandoned(client, after delivery-deadline)-----> reclaimed

delivered --approve-and-release(client)--------------------------> paid
delivered --auto-release(anyone, after approval-deadline)--------> paid
delivered --dispute(client, before approval-deadline)-----------> disputed

disputed ---resolve-dispute(both submit matching split)----------> resolved
```

- **Delivery confirmation** — only the freelancer, only before the deadline.
- **Approval / dispute window** — once delivered, the client has `approval-window`
  blocks to approve or dispute.
- **Auto-release on silence** — after the approval deadline, *anyone* can trigger
  release to the freelancer, so a client can't stall forever by doing nothing.
- **Mutual-consent disputes** — both sides independently propose a split; it
  executes only when the two proposals match exactly.
- **Abandonment protection** — if the freelancer never delivers, the client
  reclaims the full escrow after the delivery deadline.

## Repository layout

```
contracts/
  custos.clar          the escrow contract (Clarity 3, SIP-010)
  mock-usdcx.clar       mock SIP-010 token — local tests only
  mock-token-b.clar     second mock token — wrong-token test only
  test-usdcx.clar       mintable test token used for the live testnet e2e
custos.test.ts          full test suite (36 tests)
Clarinet.toml           project + the real SIP-010 trait requirement
settings/               network settings (Testnet.toml holds the deployer key — not committed)
web/                    Next.js frontend (dashboard + hire flow)
theme/                  design tokens + Tailwind theme ("the guardian vault")
```

## Running it

### Contracts

```bash
clarinet check          # type-check all contracts
npm install && npm test # run the 36-test suite
```

### Frontend

```bash
cd web
npm install
npm run dev             # http://localhost:3000
```

The app reads/writes the deployed testnet contract. Connect Leather or Xverse.
`test-usdcx` has an open mint, so the dashboard's "Mint test tokens" button lets
you fund a wallet for demoing without needing real USDCx.

## Known limitations (stated plainly, not hidden)

- **Two client-signed transactions per hire** (FlowVault split + escrow lock) —
  not atomic, by design, both shown as explicit sequential steps.
- **No arbitrator.** If a dispute's two proposals never converge, the escrow
  stays frozen in `disputed` permanently. This is the real tradeoff of trustless
  mutual-consent resolution, not an oversight.
- **Dispute proposals are public on-chain** the moment they're submitted — an
  open negotiation, not a sealed bid.
- **`auto-release` is permissionless** — intentional (prevents client stalling),
  but the caller pays their own gas with no guaranteed refund.
- **Real USDCx isn't acquirable on testnet** (Circle-bridge-only: no faucet, no
  swap, no open mint). The app therefore defaults to a mintable `test-usdcx`.
  `custos` is token-agnostic — swap the token principal in
  [`web/lib/config.ts`](web/lib/config.ts) to run against real USDCx.
- **The FlowVault signing-bonus leg is currently stubbed** in the frontend and
  clearly labeled as such. The escrow leg is fully functional against the
  deployed contract; wiring `flowvault-sdk` is the remaining integration step.

## Error codes

`u100` not-found · `u101` unauthorized · `u102` not active · `u103` not
delivered · `u104` not disputed · `u105` zero-amount · `u106`
client==freelancer · `u107` zero window · `u108` auto-release too early · `u109`
delivery deadline passed · `u110` delivery deadline not reached · `u111` dispute
window passed · `u112` split exceeds escrow · `u113` wrong token.

## License

[MIT](LICENSE).
