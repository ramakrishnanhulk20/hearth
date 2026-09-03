import type { ReactNode } from "react";

/**
 * The console's only container: a raised dark panel on the near-black ground.
 *
 * Depth comes from the fill, one hairline and the light across the top edge, never from a stack
 * of drop shadows. A card that glows at its top edge reads as a lit object in the room the
 * landing page builds; a card sitting on a shadow reads as a template.
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
    <section className={`panel-glare rounded-card border bg-surface ${border} ${className}`}>
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
      ? "border-flame/45 bg-flame/[0.10] text-flameInk"
      : tone === "good"
        ? "border-good/40 bg-good/[0.08] text-good"
        : tone === "warn"
          ? "border-warn/40 bg-warn/[0.08] text-warn"
          : tone === "bad"
            ? "border-bad/40 bg-bad/[0.08] text-bad"
            : "border-hairline text-muted";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-medium ${skin}`}
    >
      {icon}
      {children}
    </span>
  );
}
