"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Spinner } from "@/components/ui";

export type ButtonTone = "flame" | "quiet";

const SHAPE =
  "flex h-14 w-full items-center justify-center gap-2.5 rounded-xl text-[13px] font-semibold uppercase tracking-[0.09em] transition-colors";

/** One skin for the button and the link, so the two never drift apart on the same screen. */
function skin(tone: ButtonTone, off: boolean): string {
  if (off) return `${SHAPE} bg-hairline text-faint cursor-not-allowed`;
  return tone === "flame"
    ? `${SHAPE} bg-flameFill text-onFlame hover:brightness-[0.94]`
    : `${SHAPE} border border-hairlineStrong text-parchment hover:bg-hover`;
}

/**
 * The one action a console screen offers, full width at the bottom of the form.
 *
 * It is grey and unclickable until the form is valid, so a saver never sends a transaction that
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
