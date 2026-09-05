"use client";

import { useFormat } from "@/hooks/useFormat";
import { useNow } from "@/hooks/useHearth";

/**
 * A clock, owning its own tick.
 *
 * The dashboard used to read the second hand at the top of the tree and hand it down, which
 * re-rendered the position card and the whole tier table once a second for the sake of one line
 * of text. The subscription lives here instead, so the only thing React redraws on the tick is
 * the countdown itself.
 */
export function Countdown({ target }: { target: number }) {
  const format = useFormat();
  const now = useNow();

  return <>{format.countdown(target, now)}</>;
}
