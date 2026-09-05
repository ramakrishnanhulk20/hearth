"use client";

import { useEffect, useState } from "react";

/**
 * Whole seconds since something started, and zero the moment it stops.
 *
 * A decryption is one round trip to Zama's relayer on a good day and a minute of retries on a bad
 * one, and a spinner says the same thing at both. The count is what turns "is this broken" into
 * "this is taking a while", which is a question somebody can act on.
 *
 * The start is captured inside the effect rather than during render, because reading the clock
 * while rendering makes the same render produce different output on every attempt.
 */
export function useElapsed(running: boolean): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 500);
    return () => {
      clearInterval(timer);
      // Cleared on the way out rather than on the way in, so the next run starts from zero
      // instead of showing the last one's total for half a second.
      setSeconds(0);
    };
  }, [running]);

  return running ? seconds : 0;
}
