"use client";

import { useTranslations } from "next-intl";
import { useRef, type KeyboardEvent } from "react";

export type Stage = "vault" | "unshield";

const ORDER: Stage[] = ["vault", "unshield"];

export const tabId = (stage: Stage) => `withdraw-tab-${stage}`;
export const panelId = (stage: Stage) => `withdraw-panel-${stage}`;

/**
 * The two stages of getting money out, one shown at a time.
 *
 * They are tabs rather than steps because they are not always run in order. A saver who wrapped
 * but never deposited has only the second one to do, and a saver who wants to keep a standing
 * confidential balance never does it at all.
 */
export function StageTabs({
  stage,
  onChange,
  alert,
}: {
  stage: Stage;
  onChange: (next: Stage) => void;
  /** A stage with something unfinished waiting in it. Used for an unshield that was never finalized. */
  alert?: Stage | null;
}) {
  const t = useTranslations("withdraw.tabs");
  const tabs = useRef<Partial<Record<Stage, HTMLButtonElement | null>>>({});

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = ORDER.indexOf(stage);
    // The arrow that moves forward is the one that points along the reading direction, so on an
    // Arabic page the left arrow goes to the next tab rather than back to the previous one.
    const rtl = typeof document !== "undefined" && document.dir === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    const next =
      event.key === forward
        ? ORDER[(index + 1) % ORDER.length]
        : event.key === back
          ? ORDER[(index + ORDER.length - 1) % ORDER.length]
          : event.key === "Home"
            ? ORDER[0]
            : event.key === "End"
              ? ORDER[ORDER.length - 1]
              : null;
    if (!next) return;
    event.preventDefault();
    onChange(next);
    tabs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={t("label")}
      className="flex gap-1 rounded-xl border border-hairline bg-raised p-1"
    >
      {ORDER.map((key, index) => {
        const here = key === stage;
        // The stage you are on is lit, not filled. A solid accent block behind the label would sit
        // at the same strength as the marker inside it and as the button at the bottom of the
        // panel, and this console says where you are by lighting a row rather than painting it.
        return (
          <button
            key={key}
            ref={(node) => {
              tabs.current[key] = node;
            }}
            type="button"
            role="tab"
            id={tabId(key)}
            aria-selected={here}
            aria-controls={panelId(key)}
            tabIndex={here ? 0 : -1}
            onClick={() => onChange(key)}
            onKeyDown={onKeyDown}
            className={`flex flex-1 items-center justify-center gap-2.5 rounded-lg border px-2.5 py-2.5 text-[13.5px] transition-colors ${
              here
                ? "border-flame/45 bg-flame/[0.10] font-medium text-flameInk"
                : "border-transparent text-muted hover:bg-hover hover:text-parchment"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12.5px] tabular-nums ${
                here ? "bg-flameFill text-onFlame shadow-ember" : "border border-hairline text-muted"
              }`}
            >
              {index + 1}
            </span>
            <span className="min-w-0 truncate">{t(key)}</span>
            {alert === key && (
              <>
                <span className="sr-only">{t("unfinished")}</span>
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
