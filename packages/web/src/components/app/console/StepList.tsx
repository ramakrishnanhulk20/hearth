"use client";

import type { ReactNode } from "react";
import { CheckIcon } from "./icons";
import { CARD_NOTE } from "./typography";

export type StepStatus = "done" | "active" | "todo";

export type Step = {
  key: string;
  title: string;
  /** The controls for this step. Rendered only while it is the active one. */
  body?: ReactNode;
  /** One line on the collapsed row once the step is behind you, such as the amount it moved. */
  summary?: ReactNode;
  status: StepStatus;
};

/**
 * A guided flow with one step open at a time.
 *
 * Status is passed in rather than counted here, because what is done is a fact about the chain
 * (an allowance, a confidential balance, a receipt) and never a number this component increments.
 */
export function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <li key={step.key} className="relative flex gap-4">
            <div className="flex flex-col items-center">
              <Marker status={step.status} index={index + 1} />
              {!last && <span className="w-px flex-1 bg-hairline" />}
            </div>

            <div className={`min-w-0 flex-1 ${last ? "pb-0" : "pb-6"} ${index === 0 ? "" : "pt-0"}`}>
              {/* Done and still to come share the body tone: the marker beside them already says
                  which is which, and a title nobody can read is not a quieter title, it is a
                  step the reader skips. Only the open one takes the full weight. */}
              <p
                className={`text-[14px] leading-6 ${
                  step.status === "active" ? "font-semibold text-parchment" : "text-muted"
                }`}
              >
                {step.title}
              </p>

              {step.status === "done" && step.summary && (
                <p className={`mt-0.5 ${CARD_NOTE}`}>{step.summary}</p>
              )}

              {step.status === "active" && step.body && <div className="mt-3">{step.body}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Where you are is the lit one, the same way the rail marks the screen you are on. A step behind
 * you keeps the flame but only as an outline, so a flow four steps in does not end up with four
 * things shouting at the same volume as the one being asked for.
 */
function Marker({ status, index }: { status: StepStatus; index: number }) {
  if (status === "done") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-flame/45 bg-flame/[0.10] text-flameInk">
        <CheckIcon size={15} />
      </span>
    );
  }

  const skin =
    status === "active"
      ? "border-transparent bg-flameFill text-onFlame font-semibold shadow-ember"
      : "border-hairline text-muted";

  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[12.5px] tabular-nums ${skin}`}
    >
      {index}
    </span>
  );
}
