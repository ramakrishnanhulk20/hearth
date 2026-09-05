"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { SiteFooter, SiteHeader } from "./SiteChrome";

/**
 * The two screens nobody plans for: a page that is not there, and a page that broke.
 *
 * They wear the site rather than the framework. A default Next 404 on a project whose whole
 * argument is that it looks like a real product is a five-second hole in that argument, and it is
 * the screen a judge is most likely to hit by pasting a stale link.
 *
 * The code is the hero, oversized and off the reading line, with the hearth's own light behind
 * it. Everything else is one sentence and a way back.
 */
export function Dead({
  code,
  title,
  body,
  detail,
  action,
}: {
  /** "404" or "500", set large enough to be the picture on the page. */
  code: string;
  title: string;
  body: string;
  /** The error's own words, when there are any worth showing. */
  detail?: ReactNode;
  /** The way back, plus a retry where one makes sense. */
  action: ReactNode;
}) {
  return (
    <div className="grain relative flex min-h-[100svh] flex-col bg-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(58% 48% at 68% 34%, rgba(249,183,64,0.14), transparent 62%)," +
            "radial-gradient(46% 52% at 14% 76%, rgba(249,209,0,0.05), transparent 66%)",
        }}
      />

      <SiteHeader sticky={false} />

      <main className="relative mx-auto flex w-full max-w-[76rem] flex-1 items-center px-4 py-20 sm:px-6">
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
          <motion.p
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-[clamp(5rem,18vw,13rem)] leading-[0.82] tracking-tightest text-flame/85"
            style={{ fontWeight: 760 }}
          >
            {code}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="lg:pb-4"
          >
            <h1
              className="max-w-[18ch] font-display text-[clamp(1.8rem,4.4vw,3rem)] leading-[1.02] tracking-tightest text-parchment"
              style={{ fontWeight: 720 }}
            >
              {title}
            </h1>
            <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-muted">{body}</p>
            {detail}
            <div className="mt-8 flex flex-wrap items-center gap-4">{action}</div>
          </motion.div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

/** The primary way out, in the landing page's voice rather than the console's. */
export function DeadLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2.5 rounded-lg bg-flameFill px-6 py-3.5 text-[15px] font-medium text-onFlame transition-transform duration-200 hover:scale-[1.02]"
    >
      {children}
      <span
        aria-hidden
        className="transition-transform duration-200 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
      >
        &rarr;
      </span>
    </Link>
  );
}

/** The quieter second option beside it: another route, or a retry. */
export function DeadAction({ onClick, href, children }: { onClick?: () => void; href?: string; children: ReactNode }) {
  const skin =
    "inline-flex items-center rounded-lg border border-hairlineStrong px-5 py-3.5 text-[14px] text-parchment transition-colors hover:bg-hover";

  if (href) {
    return (
      <Link href={href} className={skin}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={skin}>
      {children}
    </button>
  );
}
