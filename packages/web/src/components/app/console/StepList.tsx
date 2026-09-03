"use client";

import type { ReactNode } from "react";
import { CheckIcon } from "./icons";

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
              <p
                className={`text-[14px] leading-6 ${
                  step.status === "active"
                    ? "font-semibold text-parchment"
                    : step.status === "done"
                      ? "text-muted"
                      : "text-faint"
                }`}
              >
                {step.title}
              </p>

              {step.status === "done" && step.summary && (
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-faint">{step.summary}</p>
              )}

              {step.status === "active" && step.body && <div className="mt-3">{step.body}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Marker({ status, index }: { status: StepStatus; index: number }) {
  if (status === "done") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-flameFill text-onFlame">
        <CheckIcon size={15} />
      </span>
    );
  }

  const skin =
    status === "active"
      ? "border-parchment/70 text-parchment font-semibold"
      : "border-hairline text-faint";

  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[12.5px] tabular-nums ${skin}`}
    >
      {index}
    </span>
  );
}
