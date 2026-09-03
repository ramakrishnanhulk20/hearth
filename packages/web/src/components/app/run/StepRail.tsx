"use client";

import { CARD_PROSE, CardPill } from "@/components/app/console";
import { Spinner } from "@/components/ui";

export type Availability =
  | { kind: "ready"; note: string }
  | { kind: "waiting"; note: string }
  | { kind: "unknown" };

export type RunStep = {
  key: string;
  /** The stable name of the step, so the rail reads as a machine rather than a changing button. */
  title: string;
  /** The step named with whatever it would act on right now, for the card above the rail. */
  headline: string;
  /** The one or two lines saying what this transaction does to the pool. */
  does: string;
  availability: Availability;
  /** True for the single step the live pool is waiting for next. */
  due: boolean;
  buttonLabel: string;
  onRun?: () => void;
  busy: boolean;
  /** Why the button is off, for the tooltip. Null while it is on. */
  blocked: string | null;
};

/**
 * The five steps of a draw as one machine, in the order a draw needs them.
 *
 * Every step stays on screen whether or not it is available, because the point of the screen is
 * that the whole sequence is open to anybody, and a list that hid four of the five would read as
 * one button with a changing name.
 */
export function StepRail({ steps }: { steps: RunStep[] }) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => (
        <li key={step.key} className="relative flex gap-4">
          <div className="flex flex-col items-center">
            <Marker index={index + 1} step={step} />
            {index < steps.length - 1 && <span className="w-px flex-1 bg-hairline" />}
          </div>

          <div className={`min-w-0 flex-1 ${index < steps.length - 1 ? "pb-7" : ""}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <h3 className="text-[14px] font-semibold leading-6 text-parchment">{step.title}</h3>
                  <Chip step={step} />
                </div>
                <p className={`mt-1.5 max-w-[62ch] ${CARD_PROSE}`}>{step.does}</p>
                <p
                  className={`mt-2 max-w-[62ch] text-[12.5px] leading-relaxed ${
                    step.availability.kind === "ready" ? "text-flameInk" : "text-faint"
                  }`}
                >
                  {step.availability.kind === "unknown"
                    ? "Whether this step is available has not come back from the chain yet."
                    : step.availability.note}
                </p>
              </div>

              {/* The tooltip hangs on the wrapper, not the button, because a disabled button
                  swallows the hover in some browsers and the reason would never appear. */}
              <div className="shrink-0" title={step.blocked ?? undefined}>
                <StepButton step={step} />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Marker({ index, step }: { index: number; step: RunStep }) {
  const ready = step.availability.kind === "ready";
  const skin = step.due
    ? "bg-flameFill text-onFlame"
    : ready
      ? "border border-flame/60 text-flameInk"
      : "border border-hairline text-faint";

  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-semibold tabular-nums ${skin}`}
    >
      {index}
    </span>
  );
}

function Chip({ step }: { step: RunStep }) {
  if (step.due) return <CardPill tone="flame">due now</CardPill>;
  if (step.availability.kind === "ready") return <CardPill>ready</CardPill>;
  if (step.availability.kind === "unknown") return <CardPill>unknown</CardPill>;
  return <CardPill>not yet</CardPill>;
}

/**
 * Smaller than the console's one primary button on purpose: five of those stacked would each
 * claim to be the action of the screen, and only one of them is ever the next thing to send.
 */
function StepButton({ step }: { step: RunStep }) {
  const off = step.blocked !== null || step.busy || !step.onRun;
  const skin = off
    ? "bg-hairline text-faint cursor-not-allowed"
    : step.due
      ? "bg-flameFill text-onFlame hover:brightness-[0.94]"
      : "border border-hairlineStrong text-parchment hover:bg-hover";

  return (
    <button
      type="button"
      onClick={step.onRun}
      disabled={off}
      aria-label={step.headline}
      className={`flex h-10 w-full items-center justify-center gap-2 rounded-[10px] px-5 text-[12px] font-semibold uppercase tracking-[0.09em] transition-colors sm:w-[132px] ${skin}`}
    >
      {step.busy && <Spinner size={13} />}
      {step.buttonLabel}
    </button>
  );
}
