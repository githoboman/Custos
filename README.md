# Custos

**Real escrow for freelance retainers, on BOT Chain.** Held safe until it's meant to move.

Custos splits a freelance retainer into two legs that work together:

1. **Signing bonus** — paid to the freelancer *instantly* at hire time.
2. **Escrowed balance** — held in *true* on-chain escrow by the `Custos`
   contract and released only when it should be: on client approval, on
   auto-release if the client goes silent, or by a mutually-agreed split after
   a dispute.

---

## Status

| | |
|---|---|
| Contract | **deployed to BOT Chain testnet** — `0x36038b726A0cB94E5e9544483B81dD48358df486` |
| Token | ERC-20 (tUSDC). Denominated per-retainer; contract is token-agnostic. |
| Frontend | Next.js app in [`web/`](web/) — dashboard + hire flow, wired to the deployed contract |

## The retainer state machine

```
Active ----markDelivered(freelancer, before delivery-deadline)---> Delivered
Active ----reclaimAbandoned(client, after delivery-deadline)-----> Reclaimed

Delivered --approveAndRelease(client)--------------------------> Paid
Delivered --autoRelease(anyone, after approval-deadline)--------> Paid
Delivered --dispute(client, before approval-deadline)-----------> Disputed

Disputed ---resolveDispute(both submit matching split)----------> Resolved
```

- **Delivery confirmation** — only the freelancer, only before the deadline.
- **Approval / dispute window** — once delivered, the client has `approvalWindow`
   seconds to approve or dispute.
- **Auto-release on silence** — after the approval deadline, *anyone* can trigger
   release to the freelancer, so a client can't stall forever by doing nothing.
- **Mutual-consent disputes** — both sides independently propose a split; it
   executes only when the two proposals match exactly.
- **Abandonment protection** — if the freelancer never delivers, the client
   reclaims the full escrow after the delivery deadline.

## Repository layout

```
contracts/
  Custos.sol           the escrow contract (Solidity 0.8.20)
  MockERC20.sol        mock ERC-20 token for testing
scripts/               BOT Chain deployment + utility scripts
web/                   Next.js frontend (dashboard + hire flow)
theme/                 design tokens + Tailwind theme (anime edition)
```

## Running it

### Contracts

```bash
npm install
npm run compile:sol
npm run check:botchain
```

### Frontend

```bash
cd web
npm install
npm run dev             # http://localhost:3000
```

The app reads/writes the deployed BOT Chain testnet contract. Connect MetaMask or any EVM wallet.
The mock token has an open mint, so the dashboard's "Get test tokens" button lets
you fund a wallet for demoing.

## Known limitations

- **No arbitrator.** If a dispute's two proposals never converge, the escrow
   stays frozen in `Disputed` permanently.
- **Dispute proposals are public on-chain** the moment they're submitted — an
   open negotiation, not a sealed bid.
- **`autoRelease` is permissionless** — intentional (prevents client stalling),
   but the caller pays their own gas with no guaranteed refund.

## License

[MIT](LICENSE).
