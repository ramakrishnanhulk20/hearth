"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("run");

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
                {/* Finalize, reconcile and close can all be ready at once, so the flame is spent on
                    the one step that is actually next and the others carry the body tone. Four
                    yellow paragraphs on a black card is four steps claiming to be the one.
                    Ready and waiting share that body tone because the chip beside the title is
                    what tells them apart, and the sentence itself is something to read. */}
                <p
                  className={`mt-2 max-w-[62ch] text-[12.5px] leading-relaxed ${
                    step.due ? "text-flameInk" : "text-muted"
                  }`}
                >
                  {step.availability.kind === "unknown" ? t("unknownStep") : step.availability.note}
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

/**
 * The due step is the lit one and every other marker is an outline, which is how the console marks
 * the current thing on every other screen. The glow is the close one a 28px object needs; the
 * hero-sized flame shadow spreads past a marker this small and reads as a smudge.
 */
function Marker({ index, step }: { index: number; step: RunStep }) {
  const ready = step.availability.kind === "ready";
  const skin = step.due
    ? "border-transparent bg-flameFill text-onFlame shadow-ember"
    : ready
      ? "border-flame/45 bg-flame/[0.10] text-flameInk"
      : "border-hairline text-muted";

  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[12.5px] font-semibold tabular-nums ${skin}`}
    >
      {index}
    </span>
  );
}

/**
 * A step that can be sent but is not the one the pool wants next takes the colder green, so the
 * five states are told apart at a glance without a second warm colour arguing with the flame.
 * Not yet and unknown stay quiet, because neither is something a reader can act on.
 */
function Chip({ step }: { step: RunStep }) {
  const t = useTranslations("run.chip");

  if (step.due) return <CardPill tone="flame">{t("due")}</CardPill>;
  if (step.availability.kind === "ready") return <CardPill tone="good">{t("ready")}</CardPill>;
  if (step.availability.kind === "unknown") return <CardPill>{t("unknown")}</CardPill>;
  return <CardPill>{t("notYet")}</CardPill>;
}

/**
 * Smaller than the console's one primary button on purpose: five of those stacked would each
 * claim to be the action of the screen, and only one of them is ever the next thing to send.
 *
 * Off keeps a fill and an edge, the same as the primary control, because most of these five are
 * off most of the time and an edgeless tint on a near-black card is a control nobody can find.
 * The border sits on all three states so a row does not shift height as a step comes due. Five
 * off buttons is the ordinary state of this screen, so their names stay readable.
 */
function StepButton({ step }: { step: RunStep }) {
  const off = step.blocked !== null || step.busy || !step.onRun;
  // Each state names its own border colour and the shape carries only the width. Tailwind emits
  // border-transparent after the token colours, so a transparent border on the shape would win
  // over every one of these and the two edges below would never draw.
  const skin = off
    ? "cursor-not-allowed border-hairline bg-hover text-muted"
    : step.due
      ? "border-transparent bg-flameFill text-onFlame hover:shadow-ember"
      : "border-hairlineStrong text-parchment hover:bg-hover";

  return (
    <button
      type="button"
      onClick={step.onRun}
      disabled={off}
      aria-label={step.headline}
      className={`flex h-10 w-full items-center justify-center gap-2 rounded-lg border px-5 text-[13px] font-semibold transition-all duration-200 sm:w-[132px] ${skin}`}
    >
      {step.busy && <Spinner size={13} />}
      {step.buttonLabel}
    </button>
  );
}
