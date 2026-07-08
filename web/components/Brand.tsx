export function ShieldMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={(size * 22) / 20}
      viewBox="0 0 20 22"
      fill="none"
      aria-hidden
    >
      <path
        d="M10 1L18 4V10C18 15 14.5 19 10 21C5.5 19 2 15 2 10V4L10 1Z"
        stroke="var(--custos-accent)"
        strokeWidth="1.5"
        fill="var(--custos-accent-soft)"
      />
      <path
        d="M6.5 11L9 13.5L14 8"
        stroke="var(--custos-accent)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const type = size === "lg" ? "text-2xl" : "text-xl";
  return (
    <div className="flex items-center gap-3">
      <div
        className={`grid ${box} place-items-center rounded-lg border border-line-strong bg-surface-raised shadow-sm`}
      >
        <ShieldMark size={size === "lg" ? 24 : 20} />
      </div>
      <div className={`font-serif ${type} font-semibold tracking-tight text-fg`}>
        Custos
      </div>
    </div>
  );
}
