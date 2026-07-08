# Contributing to Custos

Thanks for your interest. Custos is a two-contract escrow product for freelance
retainers on Stacks; contributions to the contract, tests, frontend, or docs are
all welcome.

## Getting set up

Prerequisites: [Clarinet](https://docs.hiro.so/stacks/clarinet) and Node 20+.

```bash
# contracts
clarinet check
npm install && npm test        # 36 tests, must stay green

# frontend
cd web && npm install && npm run dev
```

## Ground rules

- **Tests must pass.** `npm test` should be 36/36 (or more, if you add coverage)
  before a PR. If you touch a fund-moving function, add a test that exercises the
  new path *and* its failure case.
- **Don't oversell.** This project documents its real limitations (no arbitrator,
  public dispute proposals, stubbed FlowVault leg). Keep that honesty — if a
  change adds a caveat, say so in the README's "Known limitations".
- **The contract is the source of truth.** UI state colors and labels map 1:1 to
  the on-chain `state` field; keep them in sync.
- **Token-agnostic.** `custos` takes the token as a trait parameter — don't
  hardcode a token principal in the contract.

## Working on the contract

- `contracts/custos.clar` is the escrow contract. It references the **real**
  deployed SIP-010 trait (`ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sip-010-trait-ft-standard`),
  pulled into simnet via a `[[project.requirements]]` in `Clarinet.toml`.
- The `mock-*.clar` and `test-usdcx.clar` contracts are test-only and must not be
  deployed as part of the product.
- To deploy: use a *separate minimal Clarinet project* containing only the
  contract you're publishing, with **no principal remapping**, so the deployed
  contract keeps referencing the real trait. (Clarinet's default plan will try to
  republish + remap the trait requirement — that breaks the token binding.)

## Working on the frontend

- Contract addresses and network live in one place: `web/lib/config.ts`.
- Reads go through `web/lib/custos-read.ts`, writes through
  `web/lib/custos-write.ts`. Keep wallet-signed calls in the write module.
- The design system is in `theme/` — use the tokens/utilities, don't hardcode
  hex values in components.

## Submitting

Open a PR with a clear description of what changed and why. For contract changes,
include the test output. Small, focused PRs are easier to review than large ones.
