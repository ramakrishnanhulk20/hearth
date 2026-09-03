import type { ReactNode } from "react";

/**
 * The top of a console route: one title, one line saying what this screen is for, one rule.
 *
 * Every screen under /app opens with this and nothing else, so a saver arriving on any of them
 * sees the same shape and reads the same distance down before the first control.
 */
export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  /** One sentence. If it needs two, the screen is doing two jobs. */
  subtitle?: ReactNode;
  /** A status chip or a secondary link, kept out of the reading line. */
  right?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <h1
          className="font-display text-[clamp(1.75rem,3.6vw,2.25rem)] leading-[1.05] tracking-tightest text-parchment"
          style={{ fontWeight: 660 }}
        >
          {title}
        </h1>
        {right && <div className="shrink-0 pt-1">{right}</div>}
      </div>
      {subtitle && <p className="mt-2.5 max-w-[64ch] text-[14.5px] leading-relaxed text-muted">{subtitle}</p>}
      <div className="mt-5 h-px w-full bg-hairline" />
    </header>
  );
}
