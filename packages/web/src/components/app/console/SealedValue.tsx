"use client";

import { useTranslations } from "next-intl";
import type { Hex } from "viem";
import { Spinner } from "@/components/ui";
import { useElapsed } from "@/hooks/useElapsed";
import { useFormat } from "@/hooks/useFormat";
import { useErrorText } from "@/hooks/useErrorText";
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
  decimals = 6,
  format: formatValue,
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
  /** The token's scale. Money figures pass their pool's; a weight passes its own format instead. */
  decimals?: number;
  format?: (value: bigint) => string;
  size?: "base" | "large";
  /** False for the second and third figures in a card, so one eye serves the whole card. */
  eye?: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations("console.reveal");
  const format = useFormat();
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
            {formatValue ? formatValue(value) : format.amount(value, decimals)}
          </span>
        ) : (
          <>
            <span className="sr-only">{t("encrypted", { label })}</span>
            <span
              aria-hidden
              className={`font-display leading-none tracking-[0.14em] text-seal ${SIZES[size]}`}
              style={{ fontWeight: 620 }}
            >
              ******
            </span>
          </>
        )}

        {shown && unit && <span className="text-[12.5px] text-muted">{unit}</span>}

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
 *
 * It carries the weight of a control rather than a caption. At the faintest tone it sat quieter
 * on the dark card than the caveat line underneath it, and it is the only way into the figure.
 */
export function RevealEye({
  scope,
  label,
  onReveal,
  disabled = false,
}: {
  scope: RevealScope;
  /** Slotted into "Reveal {label}", so it reads as a sentence: "Reveal your principal". */
  label: string;
  onReveal: () => void;
  disabled?: boolean;
}) {
  const t = useTranslations("console.reveal");
  const working = scope.state.kind === "working";

  return (
    <button
      type="button"
      onClick={() => (scope.open ? scope.hide() : onReveal())}
      disabled={disabled || working}
      aria-label={scope.open ? t("hide", { label }) : t("reveal", { label })}
      title={scope.open ? t("sealAgain") : t("cost")}
      // The eye stays 28 pixels because it sits inline with a figure. The invisible square
      // around it is 44, which is what a thumb needs.
      className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors after:absolute after:-inset-2 after:content-[''] hover:bg-hover hover:text-flameInk disabled:opacity-50"
    >
      {working ? <Spinner size={15} /> : scope.open ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
    </button>
  );
}

/** Past this many seconds a reveal stops looking quick and starts looking stuck. */
const PATIENCE = 5;

/**
 * What the reveal is doing, or why it refused. Rendered by whichever figure owns the eye.
 *
 * The live region stays in the page while the scope is sealed, holding nothing, because a screen
 * reader only announces a region that was already there when its text changed. It carries no gap
 * of its own for the same reason: an empty one must take no space.
 *
 * Past five seconds the wait names itself and offers a way out. The relayer can spend the better
 * part of a minute waiting for a freshly written value to become decryptable, and a spinner with
 * no clock and no exit is indistinguishable from a hang.
 */
export function RevealNote({ scope }: { scope: RevealScope }) {
  const t = useTranslations("console.reveal");
  const errorText = useErrorText();
  const { state } = scope;
  const working = state.kind === "working";
  const elapsed = useElapsed(working);

  const text =
    state.kind === "working"
      ? t(state.note)
      : state.kind === "denied"
        ? t("denied")
        : state.kind === "failed"
          ? errorText(state.error)
          : null;

  return (
    <span className={text === null ? "" : "mt-1 inline-flex flex-col gap-1"}>
      <span
        role="status"
        aria-live="polite"
        className={`text-[12.5px] leading-snug ${working ? "text-muted" : "text-bad"}`}
      >
        {text}
      </span>

      {working && elapsed >= PATIENCE && (
        <span className="inline-flex items-center gap-3 text-[12.5px] leading-snug">
          <span className="tabular-nums text-muted">{t("elapsed", { seconds: elapsed })}</span>
          <button
            type="button"
            onClick={scope.hide}
            className="text-flameInk underline-offset-2 hover:underline"
          >
            {t("stopWaiting")}
          </button>
        </span>
      )}
    </span>
  );
}
