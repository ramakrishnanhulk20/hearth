"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

/**
 * The one instruction the first screen needs.
 *
 * The landing is eight pages of scroll-driven story behind a title that fills the window, and a
 * reader who does not scroll sees the first frame of a film and leaves. This sits on the reading
 * line rather than dead centre, so it belongs to the caption above it instead of floating.
 *
 * It goes the moment somebody scrolls, and never comes back: an instruction that stays on screen
 * after it has been followed is decoration. The fade is written straight to the node so the
 * overlay never re-renders and never competes with the scene for a frame.
 */
export function ScrollCue() {
  const t = useTranslations("landing");
  const node = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = node.current;
    if (!el) return;

    let gone = false;
    const dismiss = () => {
      if (gone) return;
      gone = true;
      el.style.opacity = "0";
      remove();
    };

    const onKey = (event: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", "End", " ", "Space"].includes(event.key)) dismiss();
    };

    const remove = () => {
      window.removeEventListener("wheel", dismiss);
      window.removeEventListener("touchmove", dismiss);
      window.removeEventListener("scroll", dismiss);
      window.removeEventListener("keydown", onKey);
    };

    window.addEventListener("wheel", dismiss, { passive: true });
    window.addEventListener("touchmove", dismiss, { passive: true });
    window.addEventListener("scroll", dismiss, { passive: true });
    window.addEventListener("keydown", onKey);

    // The story hijacks the wheel inside a canvas, so the window may never report a scroll. Five
    // seconds of somebody reading the title is long enough that the hint has done its job.
    const timer = window.setTimeout(dismiss, 12_000);

    return () => {
      remove();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div
      ref={node}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-7 z-40 px-6 opacity-100 transition-opacity duration-700 lg:px-16"
    >
      <div className="mx-auto flex w-full max-w-[92rem] items-center gap-3">
        <span className="text-[10.5px] uppercase tracking-[0.28em] text-flame/70">{t("scrollCue")}</span>
        {/* A rule with a spark running down it: the same gesture the console uses for a lit row,
            turned on its side. Reduced motion keeps the rule and drops the travel. */}
        <span className="relative block h-px w-16 overflow-hidden bg-white/15">
          <span className="scroll-spark absolute inset-y-0 start-0 block w-6 bg-flame/80" />
        </span>
      </div>
    </div>
  );
}
