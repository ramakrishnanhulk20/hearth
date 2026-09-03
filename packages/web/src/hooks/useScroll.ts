"use client";

import Lenis from "lenis";
import { useEffect } from "react";

/**
 * Smooth scrolling on the long reading pages.
 *
 * Not on the landing page: React Three Fiber's ScrollControls owns the scroll there and two
 * scrollers fighting each other feels worse than either alone. Disabled outright when the reader
 * has asked for reduced motion.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);
}
