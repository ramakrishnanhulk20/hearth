import type { ReactNode } from "react";

/**
 * The console's only container: white, one hairline, no shadow.
 *
 * Depth is carried by the border alone. Stacked shadows on a light surface read as a template,
 * and the reference this console follows uses none.
 */
export function Card({
  label,
  pill,
  children,
  footer,
  tone = "plain",
  className = "",
}: {
  /** The bold line at the top left. Leave it out for a card that is all body. */
  label?: ReactNode;
  /** The chip at the top right: a token, a status, a count. */
  pill?: ReactNode;
  children: ReactNode;
  /** Sits below a hairline at the bottom of the card, for the action or the fine print. */
  footer?: ReactNode;
  tone?: "plain" | "accent";
  className?: string;
}) {
  const border = tone === "accent" ? "border-flame/45" : "border-hairline";

  return (
    <section className={`rounded-card border bg-surface ${border} ${className}`}>
      {(label || pill) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-5">
          {label && <h2 className="text-[13.5px] font-semibold text-parchment">{label}</h2>}
          {pill && <div className="shrink-0">{pill}</div>}
        </div>
      )}
      <div className={`px-5 pb-5 sm:px-6 ${label || pill ? "pt-3.5" : "pt-5"}`}>{children}</div>
      {footer && <div className="border-t border-hairlineSoft px-5 py-4 sm:px-6">{footer}</div>}
    </section>
  );
}

/** The chip a card wears at its top right. Quiet by default, so the card label stays first. */
export function CardPill({
  children,
  icon,
  tone = "quiet",
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: "quiet" | "flame" | "good" | "warn" | "bad";
}) {
  const skin =
    tone === "flame"
      ? "border-flame/50 bg-flame/15 text-parchment"
      : tone === "good"
        ? "border-good/40 text-good"
        : tone === "warn"
          ? "border-warn/40 text-warn"
          : tone === "bad"
            ? "border-bad/40 text-bad"
            : "border-hairline text-muted";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium ${skin}`}
    >
      {icon}
      {children}
    </span>
  );
}
