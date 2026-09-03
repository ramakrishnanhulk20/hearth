"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Spinner } from "@/components/ui";

export type ButtonTone = "flame" | "quiet";

/**
 * The shape carries the border width and nothing about its colour. Tailwind emits
 * border-transparent after every token border colour, so a colour on the shape wins over the one
 * each state names below and both the quiet and the off states lose their edge entirely.
 *
 * Sentence case, not capitals. Capitals with tracking are how this console writes a label, and a
 * button that borrows the label voice reads as a caption of the thing above it. It is also the
 * voice the landing page uses on its own call to action.
 */
const SHAPE =
  "flex h-14 w-full items-center justify-center gap-2.5 rounded-lg border text-[14px] font-semibold transition-all duration-200";

/**
 * One skin for the button and the link, so the two never drift apart on the same screen.
 *
 * Off keeps a fill and an edge instead of dropping to a bare tint, because a disabled control on
 * a near-black ground with no edge is a control the reader cannot find at all, and this is the
 * one thing the screen is asking them to do. Its label sits at the body tone for the same
 * reason: the fill, the weaker edge and the missing hover are what say off, and a name nobody
 * can read is not a quieter button, it is a button whose purpose is a guess.
 */
function skin(tone: ButtonTone, off: boolean): string {
  // Filled with a whisper of an edge, against a quiet button that is an edge with no fill. The
  // two are opposites rather than two weights of the same thing, because the resting state of a
  // form screen is a disabled primary sitting directly above an enabled secondary.
  if (off) return `${SHAPE} cursor-not-allowed border-hairlineSoft bg-hover text-muted`;
  return tone === "flame"
    ? `${SHAPE} border-transparent bg-flameFill text-onFlame hover:shadow-flame`
    : `${SHAPE} border-hairlineStrong text-parchment hover:bg-hover`;
}

/**
 * The one action a console screen offers, full width at the bottom of the form.
 *
 * It is dimmed and unclickable until the form is valid, so a saver never sends a transaction that
 * the contract was always going to revert.
 */
export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  busy = false,
  tone = "flame",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  /** "quiet" for the second full-width action on a screen, so the two do not compete. */
  tone?: ButtonTone;
}) {
  const off = disabled || busy;

  return (
    <button type="button" onClick={onClick} disabled={off} className={skin(tone, off)}>
      {busy && <Spinner size={15} />}
      {children}
    </button>
  );
}

/**
 * The same control where the action is another screen.
 *
 * A route is a link so it behaves like one: middle click, open in a new tab, and the status bar
 * showing where it goes before it is pressed.
 */
export function PrimaryLink({
  href,
  children,
  tone = "flame",
}: {
  href: string;
  children: ReactNode;
  tone?: ButtonTone;
}) {
  return (
    <Link href={href} className={skin(tone, false)}>
      {children}
    </Link>
  );
}
