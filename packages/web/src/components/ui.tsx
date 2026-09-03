"use client";

import Link from "next/link";
import { useId, type ReactNode } from "react";
import { motion } from "framer-motion";
import type { Phase } from "@/hooks/useActions";
import { txUrl } from "@/lib/chain/addresses";

/** The mark: a hearth mouth with a flame in it. Repeated in the header, the favicon and the tab. */
export function HearthMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0 overflow-visible">
      <path
        d="M4 21V9.5A5.5 5.5 0 0 1 9.5 4h5A5.5 5.5 0 0 1 20 9.5V21"
        fill="none"
        stroke="rgb(var(--flame-ink) / 0.75)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M2.6 21h18.8" stroke="rgb(var(--flame-ink) / 0.75)" strokeWidth="1.6" strokeLinecap="round" />
      <path
        className="flame-core"
        d="M12 10.2c1.9 1.3 2.8 2.6 2.8 4a2.8 2.8 0 0 1-5.6 0c0-1.4.9-2.7 2.8-4z"
        fill="rgb(var(--flame-ink))"
      />
    </svg>
  );
}

export function Wordmark({ size = 18 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <HearthMark size={size + 4} />
      <span
        className="font-display tracking-[-0.02em] text-parchment"
        style={{ fontWeight: 680, fontSize: size }}
      >
        Hearth
      </span>
    </span>
  );
}

export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <circle cx="12" cy="12" r="9" fill="none" stroke="rgb(var(--flame-ink) / 0.2)" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="rgb(var(--flame-ink))" strokeWidth="3" strokeLinecap="round">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.9s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}

export function Panel({
  title,
  hint,
  children,
  tone = "default",
  step,
}: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
  tone?: "default" | "accent";
  step?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-fill rounded-panel border p-5 shadow-glass backdrop-blur-2xl sm:p-6 ${
        tone === "accent" ? "border-flame/30" : "border-hairline"
      }`}
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="label">
          {step ? `${step} · ${title}` : title}
        </h2>
        {hint && <span className="text-[12px] text-faint">{hint}</span>}
      </div>
      {children}
    </motion.section>
  );
}

export function Figure({
  label,
  value,
  unit,
  accent = false,
  note,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  accent?: boolean;
  note?: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-label text-faint">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span
          className={`font-display text-[24px] leading-none tabular-nums tracking-tight sm:text-[26px] ${
            accent ? "text-flameInk" : "text-parchment"
          }`}
          style={{ fontWeight: 620 }}
        >
          {value}
        </span>
        {unit && <span className="text-[12px] text-faint">{unit}</span>}
      </p>
      {note && <p className="mt-1 text-[12px] leading-snug text-faint">{note}</p>}
    </div>
  );
}

/** What an encrypted value looks like before its owner opens it. */
export function SealedBars({ count = 5, label = "encrypted" }: { count?: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-[3px] align-middle" aria-label={label}>
      {Array.from({ length: count }).map((_, index) => (
        <span key={index} className="block h-[17px] w-[10px] rounded-[2px] bg-seal" />
      ))}
    </span>
  );
}

export function Button({
  children,
  onClick,
  href,
  disabled = false,
  busy = false,
  tone = "ghost",
  size = "base",
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  busy?: boolean;
  tone?: "primary" | "ghost" | "quiet";
  size?: "base" | "small";
  className?: string;
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40";
  const scale = size === "small" ? "px-3 py-2 text-[13px]" : "px-4 py-3 text-[14px]";
  const skin =
    tone === "primary"
      ? "bg-flameFill text-onFlame hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-8px_rgba(249,209,0,0.6)]"
      : tone === "quiet"
        ? "text-faint hover:text-parchment"
        : "border border-hairline text-parchment hover:-translate-y-0.5 hover:border-flame/45 hover:bg-flame/[0.06] hover:text-flameInk";

  if (href) {
    return (
      <Link href={href} className={`${base} ${scale} ${skin} ${className}`} title={title}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      title={title}
      className={`${base} ${scale} ${skin} ${className}`}
    >
      {busy && <Spinner size={14} />}
      {children}
    </button>
  );
}

export function AmountField({
  name,
  value,
  onChange,
  onMax,
  maxLabel,
  disabled = false,
  problem,
  suffix = "USDC",
  variant = "boxed",
}: {
  /** What this field is for. Four of these sit on one page, so the placeholder cannot name them. */
  name?: string;
  value: string;
  onChange: (next: string) => void;
  onMax?: () => void;
  maxLabel?: string;
  disabled?: boolean;
  problem?: string | null;
  suffix?: string;
  /**
   * "plain" drops the framing and enlarges the digits, for the console cards that supply their
   * own border, label and ticker. The input, its validation and its accessible name are the same
   * in both, so the two never drift apart.
   */
  variant?: "boxed" | "plain";
}) {
  const problemId = useId();

  const input = (
    <input
      inputMode="decimal"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder="0.00"
      aria-label={name}
      aria-invalid={problem ? true : undefined}
      aria-describedby={problem ? problemId : undefined}
      className={
        variant === "plain"
          ? "w-full min-w-0 bg-transparent font-display text-[34px] leading-none tabular-nums tracking-tight text-parchment outline-none placeholder:text-faint disabled:opacity-60 sm:text-[40px]"
          : "w-full min-w-0 bg-transparent font-display text-[20px] tabular-nums tracking-tight text-parchment outline-none placeholder:text-parchment/25 sm:text-[22px]"
      }
      style={{ fontWeight: variant === "plain" ? 600 : 560 }}
    />
  );

  const problemLine = problem ? (
    <p id={problemId} className="mt-2 text-[12.5px] leading-snug text-bad">
      {problem}
    </p>
  ) : null;

  if (variant === "plain") {
    return (
      <div>
        <div className="flex items-center gap-3">
          {input}
          {onMax && (
            <button
              type="button"
              onClick={onMax}
              disabled={disabled}
              aria-label={name ? `${maxLabel ?? "Max"}: ${name}` : undefined}
              className="shrink-0 rounded-md border border-hairline px-2.5 py-1 text-[11px] font-medium uppercase tracking-label text-muted transition-colors hover:border-hairlineStrong hover:text-parchment"
            >
              {maxLabel ?? "Max"}
            </button>
          )}
        </div>
        {problemLine}
      </div>
    );
  }

  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded-lg border bg-[rgba(10,10,10,0.6)] px-3 py-3 sm:px-4 ${
          problem ? "border-bad/50" : "border-hairline focus-within:border-flame/45"
        }`}
      >
        <span className="text-[16px] text-faint">$</span>
        {input}
        {onMax && (
          <button
            type="button"
            onClick={onMax}
            disabled={disabled}
            aria-label={name ? `${maxLabel ?? "Max"}: ${name}` : undefined}
            className="shrink-0 rounded-md border border-hairline px-2 py-1 text-[11px] uppercase tracking-label text-faint transition-colors hover:border-flame/45 hover:text-flameInk"
          >
            {maxLabel ?? "Max"}
          </button>
        )}
        <span className="shrink-0 text-[13px] text-faint">{suffix}</span>
      </div>
      {problemLine}
    </div>
  );
}

export type BannerTone = "warn" | "bad" | "good" | "info";

export function Banner({
  tone,
  title,
  children,
  action,
}: {
  tone: BannerTone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const skin =
    tone === "bad"
      ? "border-bad/40 bg-bad/[0.08]"
      : tone === "warn"
        ? "border-warn/40 bg-warn/[0.08]"
        : tone === "good"
          ? "border-good/40 bg-good/[0.08]"
          : "border-hairline bg-[rgba(255,255,255,0.03)]";
  const dot = tone === "bad" ? "bg-bad" : tone === "warn" ? "bg-warn" : tone === "good" ? "bg-good" : "bg-faint";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col gap-2 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${skin}`}
    >
      <div className="flex items-start gap-2.5">
        <span className={`mt-[7px] block h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
        <div>
          <p className="text-[13.5px] font-medium text-parchment">{title}</p>
          {children && <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{children}</p>}
        </div>
      </div>
      {action && <div className="shrink-0 sm:pl-2">{action}</div>}
    </motion.div>
  );
}

const PHASE_TEXT: Record<string, string> = {
  encrypting: "encrypting and proving, about ten seconds",
  signing: "confirm in your wallet",
  mining: "waiting for the transaction to be mined",
  done: "done",
};

/** One line under an action, saying exactly where it is and what to do about it. */
export function PhaseNote({
  phase,
  label,
  onDismiss,
  remedyButton,
}: {
  phase: Phase;
  label: string;
  onDismiss: () => void;
  remedyButton?: ReactNode;
}) {
  const working = phase.kind === "encrypting" || phase.kind === "signing" || phase.kind === "mining" || phase.kind === "decrypting";
  const text =
    phase.kind === "idle"
      ? null
      : phase.kind === "error"
        ? phase.error.message
        : phase.kind === "decrypting"
          ? `${label}: ${phase.note}`
          : `${label}: ${PHASE_TEXT[phase.kind] ?? phase.kind}`;
  const colour = phase.kind === "done" ? "text-good" : phase.kind === "error" ? "text-bad" : "text-muted";
  const hash = phase.kind === "mining" ? phase.hash : phase.kind === "done" ? phase.hash : null;

  // The wrapper stays in the page while the action is idle, empty. A live region that is inserted
  // with its text already in it is announced unreliably, and this line is the only thing telling a
  // screen reader that a wallet prompt is waiting.
  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {text !== null && (
        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-hairlineSoft bg-[rgba(10,10,10,0.68)] px-4 py-3 backdrop-blur-md sm:flex-row sm:items-start">
          {working && (
            <span className="mt-0.5 hidden sm:block">
              <Spinner size={14} />
            </span>
          )}
          <div className="flex-1">
            <p className={`text-[13px] leading-relaxed ${colour}`}>{text}</p>
            {hash && (
              <a
                href={txUrl(hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-[12px] text-flameInk underline-offset-2 hover:underline"
              >
                View the transaction on Etherscan
              </a>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {remedyButton}
            {(phase.kind === "done" || phase.kind === "error") && (
              <button
                type="button"
                onClick={onDismiss}
                className="text-[12px] text-faint transition-colors hover:text-parchment"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Row({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-hairlineSoft py-2.5 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="shrink-0 text-[13px] text-faint">{label}</span>
      <span className="break-words sm:text-right">
        <span className="text-[13.5px] tabular-nums text-parchment">{value}</span>
        {note && <span className="ml-2 text-[12px] text-faint">{note}</span>}
      </span>
    </div>
  );
}

export function Pill({ children, tone = "quiet" }: { children: ReactNode; tone?: "quiet" | "flame" | "good" | "bad" }) {
  const skin =
    tone === "flame"
      ? "border-flame/40 text-flameInk"
      : tone === "good"
        ? "border-good/40 text-good"
        : tone === "bad"
          ? "border-bad/40 text-bad"
          : "border-hairline text-faint";
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-[3px] text-[11px] uppercase tracking-label ${skin}`}>
      {children}
    </span>
  );
}
