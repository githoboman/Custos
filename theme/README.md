# Custos theme — "the guardian vault"

Design tokens + Tailwind config for the Custos frontend. Dark, secure,
vault-like: deep charcoal-navy surfaces, one emerald **trust accent** for value
that's safe/released, guardian **gold** for the locked/escrowed amount, and a
set of **state colors mapped 1:1 to the on-chain retainer state machine**.

> Custos is Latin for *guardian / protector*. The whole visual language says
> "your money is held safe until it's meant to move." That's the product.

## Files

| File | What it is |
|------|-----------|
| `custos-tokens.css` | **Source of truth.** All colors, type, radii, shadows as CSS variables. |
| `tailwind.config.ts` | Tailwind theme that maps those vars to utilities (`bg-surface`, `text-accent`, `bg-state-disputed-soft`, `shadow-glow-accent`, …). |
| `globals.css` | Base layer (background vignette, fonts, focus ring) + reusable component classes (`.custos-card`, `.custos-btn--primary`, `.custos-badge--disputed`, …). |

## Palette rationale

- **Surfaces** step from `--custos-void` (app bg) up through `surface` / `surface-raised` to build vault depth without borders everywhere.
- **Emerald accent** (`--custos-accent`) is reserved for *trust/value-safe* moments: the primary CTA, released escrow, success. Don't spend it on chrome.
- **Gold** (`--custos-gold`) marks the **escrowed / locked** amount — the thing being guarded. Use `.custos-card--secured` for the lock panel.
- **State colors** correspond exactly to the contract's `state` field, so the UI color *is* the on-chain truth:
  | state | color | meaning |
  |-------|-------|---------|
  | `active` | blue | funded, awaiting delivery |
  | `delivered` | violet | submitted, client's window open |
  | `disputed` | orange | frozen, awaiting mutual resolution |
  | `paid` / `resolved` | emerald | escrow released |
  | `reclaimed` | grey | returned to client (abandonment) |
- **Mono font** (JetBrains Mono) for all amounts, addresses, and block heights — anything financial or on-chain reads as tabular/monospace.

## Wiring it into the Next.js app (once scaffolded)

The brief calls for Next.js (App Router) + Tailwind, mirroring `examples/flowpay`.
After `create-next-app` with Tailwind:

1. Copy `custos-tokens.css` into the app (e.g. `app/custos-tokens.css`).
2. Replace the generated `tailwind.config.ts` with this one (adjust `content` globs to your structure).
3. Make `app/globals.css` start with the imports from this folder's `globals.css` (tokens → Tailwind layers → component classes).
4. Ensure Tailwind v3 (`darkMode: "class"`) — or tell me and I'll adapt for v4's `@theme` syntax.

Then in components:

```tsx
<div className="custos-card p-6">
  <span className="custos-badge custos-badge--disputed">disputed</span>
  <p className="tabular text-2xl text-gold">8,000 <span className="text-muted text-sm">USDCx escrowed</span></p>
  <button className="custos-btn custos-btn--primary">Approve &amp; release</button>
</div>
```

## Notes / open choices

- **Font delivery:** `globals.css` pulls Inter + JetBrains Mono from Google Fonts for zero-setup preview. For production, switch to `next/font` (faster, no layout shift).
- **Tailwind version:** written for **v3**. flowpay/savings-vault likely use v3; if the scaffold lands on v4, the color mapping moves into an `@theme` block — quick to convert.
- Light mode isn't defined — Custos is dark by design. If a light variant is ever needed, it's a second `:root`-level token set, not a rework.
