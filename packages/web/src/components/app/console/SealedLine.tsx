"use client";

import { formatAmount } from "@/lib/format";
import type { RevealScope } from "@/hooks/useReveal";
import { RevealEye, RevealNote } from "./SealedValue";
import { Unknown } from "./Unknown";

/**
 * The balance under an amount field, sealed until its owner asks.
 *
 * SealedValue shows one handle at headline size. This is the line-sized version, and it takes a
 * cleartext rather than a handle because two of the three fields that use it are capped by a sum
 * of two values, which only the screen can add up.
 *
 * Opening is a signature and never a transaction, and it happens on this button and nowhere else.
 */
export function SealedLine({
  label,
  spoken,
  scope,
  amount,
  onReveal,
  disabled = false,
}: {
  /** What the figure is, in front of it: "In the vault", "In your wallet". */
  label: string;
  /** The same thing said for a reader who cannot see the row, as in "your vault balance". */
  spoken: string;
  scope: RevealScope;
  /**
   * The cleartext, once the screen has it. Null while the values are sealed, and null again if
   * the relayer answers without one of them, which is not a zero and must not read as one.
   */
  amount: bigint | null;
  onReveal: () => void;
  disabled?: boolean;
}) {
  return (
    <span className="inline-flex flex-col">
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>{label}</span>

        {!scope.open ? (
          <>
            <span className="sr-only">{spoken}, encrypted</span>
            {/* The same size as the figure it stands in for, so pressing the eye swaps one for
                the other without the line changing height under the pointer. */}
            <span
              aria-hidden
              className="font-display text-[15px] leading-none tracking-[0.14em] text-seal"
              style={{ fontWeight: 620 }}
            >
              ******
            </span>
          </>
        ) : amount !== null ? (
          <span className="font-display text-[15px] tabular-nums text-parchment" style={{ fontWeight: 620 }}>
            {formatAmount(amount)} USDC
          </span>
        ) : (
          <Unknown scale="inline" reason="The relayer answered without this value, so the total is not known." />
        )}

        <RevealEye scope={scope} label={spoken} onReveal={onReveal} disabled={disabled} />
      </span>

      <RevealNote scope={scope} />
    </span>
  );
}
