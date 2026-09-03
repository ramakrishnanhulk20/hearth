"use client";

import type { Hex } from "viem";
import { Spinner } from "@/components/ui";
import { formatAmount } from "@/lib/format";
import type { RevealRequest, RevealScope } from "@/hooks/useReveal";
import { EyeIcon, EyeOffIcon } from "./icons";

const SIZES = {
  base: "text-[17px]",
  large: "text-[30px] sm:text-[34px]",
} as const;

/**
 * An encrypted value and the eye that opens it.
 *
 * Opening is a signature, not a transaction: proof to Zama's relayer that this wallet controls
 * the address, in exchange for the plaintext of a value the contract granted it. It costs no gas
 * and writes nothing. Nothing here runs until the eye is pressed, which is why the reveal call
 * sits in the click handler and nowhere else.
 *
 * `requests` is everything the press should open, not just this value, so one signature covers a
 * whole card and the neighbouring figures do not each prompt the wallet.
 */
export function SealedValue({
  scope,
  handle,
  requests,
  label,
  unit,
  format = formatAmount,
  size = "base",
  eye = true,
  disabled = false,
}: {
  scope: RevealScope;
  /** The ciphertext handle this figure shows. Null means this address never held the value. */
  handle: Hex | null;
  /** Every handle the eye opens in one go, this one included. */
  requests: RevealRequest[];
  /** What the number is, for a reader who cannot see the label beside it. */
  label: string;
  unit?: string;
  format?: (value: bigint) => string;
  size?: "base" | "large";
  /** False for the second and third figures in a card, so one eye serves the whole card. */
  eye?: boolean;
  disabled?: boolean;
}) {
  const { state, open } = scope;
  const value = scope.read(handle);
  const shown = open && value !== null;
  const working = state.kind === "working";

  return (
    <span className="inline-flex flex-col">
      <span className="inline-flex items-center gap-2.5">
        {shown ? (
          <span
            className={`font-display tabular-nums leading-none tracking-tight text-parchment ${SIZES[size]}`}
            style={{ fontWeight: 620 }}
          >
            {format(value)}
          </span>
        ) : (
          <>
            <span className="sr-only">{label}, encrypted</span>
            <span
              aria-hidden
              className={`font-display leading-none tracking-[0.14em] text-seal ${SIZES[size]}`}
              style={{ fontWeight: 620 }}
            >
              ******
            </span>
          </>
        )}

        {shown && unit && <span className="text-[12.5px] text-faint">{unit}</span>}

        {eye && (
          <RevealEye
            scope={scope}
            label={label}
            disabled={disabled || working}
            onReveal={() => scope.reveal(requests)}
          />
        )}
      </span>

      {eye && <RevealNote scope={scope} />}
    </span>
  );
}

/**
 * The eye itself, so every sealed figure and every sealed balance line offers the same control
 * with the same words to a screen reader.
 */
export function RevealEye({
  scope,
  label,
  onReveal,
  disabled = false,
}: {
  scope: RevealScope;
  /** Said out loud after "Reveal" or "Hide", so it reads as a sentence: "Reveal your principal". */
  label: string;
  onReveal: () => void;
  disabled?: boolean;
}) {
  const working = scope.state.kind === "working";

  return (
    <button
      type="button"
      onClick={() => (scope.open ? scope.hide() : onReveal())}
      disabled={disabled || working}
      aria-label={scope.open ? `Hide ${label}` : `Reveal ${label}`}
      title={scope.open ? "Seal it again" : "Reveal, one signature, no gas"}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:bg-hover hover:text-parchment disabled:opacity-50"
    >
      {working ? <Spinner size={15} /> : scope.open ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
    </button>
  );
}

/**
 * What the reveal is doing, or why it refused. Rendered by whichever figure owns the eye.
 *
 * The live region stays in the page while the scope is sealed, holding nothing, because a screen
 * reader only announces a region that was already there when its text changed. It carries no gap
 * of its own for the same reason: an empty one must take no space.
 */
export function RevealNote({ scope }: { scope: RevealScope }) {
  const { state } = scope;

  const text =
    state.kind === "working"
      ? state.note
      : state.kind === "denied"
        ? "Zama's relayer refused: this wallet is not the one these values belong to."
        : state.kind === "failed"
          ? state.error.message
          : null;

  return (
    <span
      role="status"
      aria-live="polite"
      className={`text-[12px] leading-snug ${state.kind === "working" ? "text-muted" : "text-bad"} ${
        text === null ? "" : "mt-1"
      }`}
    >
      {text}
    </span>
  );
}
