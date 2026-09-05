"use client";

import type { ReactNode } from "react";
import { AmountField } from "@/components/ui";
import { CoinIcon, ChevronIcon } from "./icons";
import { BALANCE_LINE, CARD_NOTE } from "./typography";

/**
 * The frame both amount boxes wear: what this box is for at the top left, the token at the top
 * right, the figure large underneath, and what you hold on the line below that.
 *
 * One shell rather than two, because the typed amount and the computed one sit next to each other
 * on deposit and on both withdraw stages, and a two-pixel difference between them is visible.
 */
function FieldCard({
  label,
  token,
  onTokenClick,
  children,
  balance,
  note,
}: {
  label: string;
  token: string;
  onTokenClick?: () => void;
  children: ReactNode;
  balance?: ReactNode;
  note?: ReactNode;
}) {
  return (
    <section className="panel-glare rounded-card border border-hairline bg-surface px-5 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13.5px] font-semibold text-parchment">{label}</h2>
        <TokenPill token={token} onClick={onTokenClick} />
      </div>

      <div className="mt-4">{children}</div>

      {(balance || note) && (
        <div className="mt-4 space-y-1">
          {balance && <div className={BALANCE_LINE}>{balance}</div>}
          {note && <p className={CARD_NOTE}>{note}</p>}
        </div>
      )}
    </section>
  );
}

/**
 * An amount somebody types.
 *
 * The input is the app's existing AmountField in its plain skin, so the decimal checks, the error
 * line and the accessible name are the same ones the old panels used.
 */
export function AmountCard({
  label,
  name,
  value,
  onChange,
  token,
  onTokenClick,
  balance,
  note,
  onMax,
  maxLabel,
  disabled = false,
  problem,
}: {
  /** What this box is for, in two words: "You deposit", "You receive". */
  label: string;
  /** The input's accessible name. Two of these can sit on one screen, so it has to be specific. */
  name: string;
  value: string;
  onChange: (next: string) => void;
  /** The ticker on the pill. Always the pool's own, never a default typed into this file. */
  token: string;
  /** Set only when the token can actually be changed. The chevron follows this, not decoration. */
  onTokenClick?: () => void;
  /** The muted line under the figure. Say "unknown" here rather than zero when nothing has read. */
  balance?: ReactNode;
  /** A second muted line, for a cap or a warning that belongs to this amount. */
  note?: ReactNode;
  onMax?: () => void;
  maxLabel?: string;
  disabled?: boolean;
  problem?: string | null;
}) {
  return (
    <FieldCard label={label} token={token} onTokenClick={onTokenClick} balance={balance} note={note}>
      <AmountField
        variant="plain"
        name={name}
        value={value}
        onChange={onChange}
        onMax={onMax}
        maxLabel={maxLabel}
        disabled={disabled}
        problem={problem}
      />
    </FieldCard>
  );
}

/**
 * The other half of a pair: the same frame, with the input replaced by a figure the screen worked
 * out.
 *
 * Shielding and withdrawing both change which token you hold, and that is the part people miss.
 * Showing the outgoing amount beside the incoming token is what makes it obvious. It is a figure
 * rather than a disabled input, because nothing here is ever typed into.
 */
export function ReceiveCard({
  label,
  token,
  value,
  balance,
  note,
}: {
  label: string;
  token: string;
  /** Null before anything is typed, which shows the faint placeholder instead of claiming a zero. */
  value: string | null;
  balance?: ReactNode;
  note?: ReactNode;
}) {
  return (
    <FieldCard label={label} token={token} balance={balance} note={note}>
      <p
        className={`font-display text-[34px] leading-none tabular-nums tracking-tight sm:text-[40px] ${
          value === null ? "text-faint" : "text-parchment"
        }`}
        style={{ fontWeight: 600 }}
      >
        {value ?? "0.00"}
      </p>
    </FieldCard>
  );
}

/** The coin and ticker chip. A button with a chevron only when there is another token to pick. */
function TokenPill({ token, onClick }: { token: string; onClick?: () => void }) {
  const inner = (
    <>
      <span className="text-flameInk">
        <CoinIcon size={17} />
      </span>
      <span className="text-[13.5px] font-medium text-parchment">{token}</span>
      {onClick && (
        <span className="text-faint">
          <ChevronIcon size={15} />
        </span>
      )}
    </>
  );

  const skin =
    "inline-flex shrink-0 items-center gap-2 rounded-full border border-hairline bg-raised px-2.5 py-1.5";

  if (!onClick) {
    return <span className={skin}>{inner}</span>;
  }

  return (
    <button type="button" onClick={onClick} className={`${skin} transition-colors hover:border-hairlineStrong`}>
      {inner}
    </button>
  );
}
