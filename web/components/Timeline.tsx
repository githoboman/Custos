import type { RetainerState } from "@/lib/types";

// The retainer journey as a horizontal stepper. The "current" step is where the
// retainer is now; branches (dispute/reclaim) are reflected in the labels.
type StepState = "done" | "current" | "todo" | "skipped";

interface Step {
  key: string;
  label: string;
}

const STEPS: Step[] = [
  { key: "funded", label: "Funded" },
  { key: "delivered", label: "Delivered" },
  { key: "approved", label: "Approved" },
  { key: "settled", label: "Settled" },
];

function stepStates(state: RetainerState): Record<string, StepState> {
  switch (state) {
    case "active":
      return { funded: "current", delivered: "todo", approved: "todo", settled: "todo" };
    case "delivered":
      return { funded: "done", delivered: "current", approved: "todo", settled: "todo" };
    case "disputed":
      return { funded: "done", delivered: "done", approved: "current", settled: "todo" };
    case "paid":
      return { funded: "done", delivered: "done", approved: "done", settled: "done" };
    case "resolved":
      return { funded: "done", delivered: "done", approved: "done", settled: "done" };
    case "reclaimed":
      return { funded: "done", delivered: "skipped", approved: "skipped", settled: "done" };
    default:
      return {};
  }
}

// End label changes with outcome so "Settled" reads correctly.
function settledLabel(state: RetainerState): string {
  if (state === "paid") return "Paid";
  if (state === "resolved") return "Split settled";
  if (state === "reclaimed") return "Reclaimed";
  return "Settled";
}

export function Timeline({ state }: { state: RetainerState }) {
  const states = stepStates(state);
  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const s = states[step.key] ?? "todo";
        const label = step.key === "settled" ? settledLabel(state) : step.label;
        return (
          <div key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <Dot s={s} />
              <span
                className={`text-xs ${
                  s === "current"
                    ? "font-semibold text-fg"
                    : s === "done"
                      ? "text-accent"
                      : s === "skipped"
                        ? "text-faint line-through"
                        : "text-muted"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-2 h-px flex-1 ${
                  states[STEPS[i + 1].key] === "done" || s === "done"
                    ? "bg-accent"
                    : "bg-line"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Dot({ s }: { s: StepState }) {
  if (s === "done")
    return (
      <div className="grid h-6 w-6 place-items-center rounded-full bg-accent text-inverse">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  if (s === "current")
    return (
      <div className="h-6 w-6 rounded-full border-2 border-accent bg-accent-soft animate-vault-pulse" />
    );
  if (s === "skipped")
    return <div className="h-6 w-6 rounded-full border border-dashed border-line" />;
  return <div className="h-6 w-6 rounded-full border border-line bg-abyss" />;
}
