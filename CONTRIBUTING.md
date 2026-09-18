# Contributing to Custos

Thanks for your interest. Custos is a two-contract escrow product for freelance
retainers on BOT Chain; contributions to the contract, tests, frontend, or docs are
all welcome.

## Getting set up

Prerequisites: Node 20+ and MetaMask (or any EVM wallet).

```bash
# contracts
npm install
npm run compile:sol

# frontend
cd web && npm install && npm run dev
```

## Ground rules

- **Don't oversell.** This project documents its real limitations (no arbitrator,
   public dispute proposals). Keep that honesty — if a change adds a caveat, say so in the README.
- **The contract is the source of truth.** UI state colors and labels map 1:1 to
   the on-chain `state` field; keep them in sync.
- **Token-agnostic.** `Custos` takes the token address as a parameter — don't
   hardcode a token address in the contract.

## Working on the contract

- `contracts/Custos.sol` is the escrow contract. It references the token as an ERC-20 address.
- `contracts/MockERC20.sol` is a test-only token and must not be deployed as part of the product.
- To deploy: use the scripts in `scripts/` (see `deploy-botchain.cjs`).

## Working on the frontend

- Contract addresses and network live in one place: `web/lib/config.ts`.
- Reads go through `web/lib/custos-read.ts`, writes through
   `web/lib/custos-write.ts`. Keep wallet-signed calls in the write module.
- The design system is in `theme/` — use the tokens/utilities, don't hardcode
   hex values in components.

## Submitting

Open a PR with a clear description of what changed and why. Small, focused PRs are easier to review than large ones.
