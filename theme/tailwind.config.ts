import type { Config } from "tailwindcss";

/**
 * Custos Tailwind theme.
 *
 * Consumes the CSS variables defined in `theme/custos-tokens.css` (import that
 * file once, globally, e.g. at the top of `app/globals.css`). Colors are wired
 * to vars so the palette stays in one place and can be re-themed without a
 * rebuild.
 *
 * Usage examples:
 *   bg-void  bg-surface  bg-surface-raised  border-line  text-muted
 *   text-accent  bg-accent  shadow-glow-accent
 *   bg-state-disputed-soft  text-state-disputed   (per retainer state)
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // surfaces
        void: "var(--custos-void)",
        abyss: "var(--custos-abyss)",
        surface: {
          DEFAULT: "var(--custos-surface)",
          raised: "var(--custos-surface-raised)",
        },
        overlay: "var(--custos-overlay)",
        line: "var(--custos-border)",
        "line-strong": "var(--custos-border-strong)",

        // text (use as text-fg / text-muted / text-faint)
        fg: "var(--custos-text)",
        muted: "var(--custos-text-muted)",
        faint: "var(--custos-text-faint)",
        inverse: "var(--custos-text-inverse)",

        // accent + gold
        accent: {
          DEFAULT: "var(--custos-accent)",
          hover: "var(--custos-accent-hover)",
          press: "var(--custos-accent-press)",
          soft: "var(--custos-accent-soft)",
        },
        gold: {
          DEFAULT: "var(--custos-gold)",
          soft: "var(--custos-gold-soft)",
        },

        // retainer state colors (state -> color + soft tint)
        state: {
          active: "var(--custos-state-active)",
          "active-soft": "var(--custos-state-active-soft)",
          delivered: "var(--custos-state-delivered)",
          "delivered-soft": "var(--custos-state-delivered-soft)",
          disputed: "var(--custos-state-disputed)",
          "disputed-soft": "var(--custos-state-disputed-soft)",
          paid: "var(--custos-state-paid)",
          "paid-soft": "var(--custos-state-paid-soft)",
          resolved: "var(--custos-state-resolved)",
          "resolved-soft": "var(--custos-state-resolved-soft)",
          reclaimed: "var(--custos-state-reclaimed)",
          "reclaimed-soft": "var(--custos-state-reclaimed-soft)",
        },

        // feedback
        danger: {
          DEFAULT: "var(--custos-danger)",
          soft: "var(--custos-danger-soft)",
        },
        warn: {
          DEFAULT: "var(--custos-warn)",
          soft: "var(--custos-warn-soft)",
        },
        info: {
          DEFAULT: "var(--custos-info)",
          soft: "var(--custos-info-soft)",
        },
      },

      fontFamily: {
        sans: "var(--custos-font-sans)",
        mono: "var(--custos-font-mono)",
      },
      fontSize: {
        xs: "var(--custos-text-xs)",
        sm: "var(--custos-text-sm)",
        base: "var(--custos-text-base)",
        lg: "var(--custos-text-lg)",
        xl: "var(--custos-text-xl)",
        "2xl": "var(--custos-text-2xl)",
        "3xl": "var(--custos-text-3xl)",
        "4xl": "var(--custos-text-4xl)",
      },

      borderRadius: {
        sm: "var(--custos-radius-sm)",
        DEFAULT: "var(--custos-radius)",
        lg: "var(--custos-radius-lg)",
        xl: "var(--custos-radius-xl)",
        full: "var(--custos-radius-full)",
      },

      boxShadow: {
        sm: "var(--custos-shadow-sm)",
        DEFAULT: "var(--custos-shadow)",
        lg: "var(--custos-shadow-lg)",
        "glow-accent": "var(--custos-glow-accent)",
        "glow-gold": "var(--custos-glow-gold)",
      },

      transitionTimingFunction: {
        custos: "var(--custos-ease)",
      },
      transitionDuration: {
        fast: "120ms",
        custos: "200ms",
      },

      keyframes: {
        "vault-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "shield-in": {
          "0%": { opacity: "0", transform: "translateY(6px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "vault-pulse": "vault-pulse 2.4s var(--custos-ease) infinite",
        "shield-in": "shield-in var(--custos-dur) var(--custos-ease)",
      },
    },
  },
  plugins: [],
};

export default config;
