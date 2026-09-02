"use client";

import type { ReactNode } from "react";
import type { Phase } from "@/hooks/useActions";
import { useMessages } from "@/i18n/LocaleProvider";

export function LanternSpinner({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={(size * 18) / 14}
      viewBox="0 0 14 18"
      aria-hidden
      className="shrink-0 overflow-visible"
    >
      <path d="M4.6 3.6a2.4 2 0 0 1 4.8 0" fill="none" stroke="rgb(var(--flame))" strokeOpacity="0.7" strokeWidth="1" />
      <rect x="2.4" y="3.4" width="9.2" height="12" rx="2.2" fill="rgb(var(--flame) / 0.1)" stroke="rgb(var(--flame))" strokeOpacity="0.55" strokeWidth="1" />
      <circle className="lantern-flame" cx="7" cy="10" r="2.7" fill="#ffd84d" />
    </svg>
  );
}

export function Card({
  title,
  hint,
  children,
  tone = "default",
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <section
      className={`glass-fill backdrop-blur-2xl rounded-panel border p-6 shadow-glass ${
        tone === "accent" ? "border-flame/30" : "border-hairline"
      }`}
    >
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="label">{title}</h2>
        {hint && <span className="text-[12px] text-faint">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export function Figure({
  label,
  value,
  unit,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-label text-faint">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span
          className={`font-display text-[26px] leading-none tabular-nums tracking-tight ${
            accent ? "text-flame" : "text-parchment"
          }`}
          style={{ fontWeight: 620 }}
        >
          {value}
        </span>
        {unit && <span className="text-[12px] text-faint">{unit}</span>}
      </p>
    </div>
  );
}

export function SealedBars({ count = 6 }: { count?: number }) {
  return (
    <span className="inline-flex items-center gap-[3px] align-middle" aria-label="encrypted">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="block h-[17px] w-[10px] rounded-[2px] bg-seal" />
      ))}
    </span>
  );
}

export function AmountField({
  value,
  onChange,
  placeholder = "0.00",
  suffix = "USDC",
  disabled = false,
  max,
  onMax,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  suffix?: string;
  disabled?: boolean;
  max?: string;
  onMax?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-hairline bg-raised px-4 py-3 focus-within:border-flame/40">
      <input
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent font-display text-[22px] tabular-nums tracking-tight text-parchment outline-none placeholder:text-parchment/20"
        style={{ fontWeight: 560 }}
      />
      {max && onMax && (
        <button
          type="button"
          onClick={onMax}
          disabled={disabled}
          className="rounded-md border border-hairline px-2 py-1 text-[11px] uppercase tracking-label text-faint transition-colors hover:border-flame/40 hover:text-flame"
        >
          Max
        </button>
      )}
      <span className="text-[13px] text-faint">{suffix}</span>
    </div>
  );
}

export function ActionButton({
  children,
  onClick,
  disabled = false,
  busy = false,
  variant = "primary",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: "primary" | "ghost";
}) {
  const base =
    "w-full rounded-lg px-5 py-3.5 text-[15px] font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-45";
  const styles =
    variant === "primary"
      ? "bg-flameFill text-onFlame hover:scale-[1.01] disabled:hover:scale-100"
      : "border border-hairline text-parchment hover:border-hairlineStrong hover:bg-hover";

  const m = useMessages();
  return (
    <button type="button" onClick={onClick} disabled={disabled || busy} className={`${base} ${styles}`}>
      {busy ? (
        <span className="inline-flex items-center justify-center gap-2">
          <LanternSpinner size={14} />
          {m.app.working}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function PhaseNote({ phase, label, onDismiss }: { phase: Phase; label: string; onDismiss: () => void }) {
  const m = useMessages();
  if (phase.kind === "idle") return null;

  const line = (() => {
    switch (phase.kind) {
      case "encrypting":
        return { text: `${label}: ${m.phase.encrypting}`, tone: "work" };
      case "signing":
        return { text: `${label}: ${m.phase.signing}`, tone: "work" };
      case "mining":
        return { text: `${label}: ${m.phase.mining}`, tone: "work" };
      case "done":
        return { text: `${label}: ${m.phase.done}`, tone: "good" };
      case "error":
        return { text: phase.message, tone: "bad" };
    }
  })();

  const color =
    line.tone === "good" ? "text-good" : line.tone === "bad" ? "text-bad" : "text-muted";

  return (
    <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-hairlineSoft bg-[rgba(10,10,10,0.68)] px-4 py-3 backdrop-blur-md">
      {line.tone === "work" && (
        <span className="mt-0.5">
          <LanternSpinner size={14} />
        </span>
      )}
      <p className={`flex-1 text-[13px] leading-relaxed ${color}`}>{line.text}</p>
      {(phase.kind === "done" || phase.kind === "error") && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-[12px] text-faint transition-colors hover:text-parchment"
        >
          {m.app.dismiss}
        </button>
      )}
    </div>
  );
}
