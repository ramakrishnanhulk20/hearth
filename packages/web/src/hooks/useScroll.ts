"use client";

import Lenis from "lenis";
import { useEffect, useRef, useState } from "react";

export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.05,

      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    let frame = 0;
    function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    }
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);
}

export function usePinProgress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [step, setStep] = useState(0);
  const progress = useRef(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let frame = 0;
    let lastStep = -1;

    function measure() {
      const el = ref.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const raw = total > 0 ? -rect.top / total : 0;
        const clamped = Math.min(1, Math.max(0, raw));
        progress.current = clamped;
        el.style.setProperty("--pin", clamped.toFixed(4));

        const next = Math.min(3, Math.floor(clamped * 3.999));
        if (next !== lastStep) {
          lastStep = next;
          setStep(next);
        }
      }
      frame = requestAnimationFrame(measure);
    }

    frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, []);

  return { ref, step, progress };
}

export function useReveal<T extends HTMLElement>(index = 0) {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const style = {
    transitionDelay: `${index * 90}ms`,
  };

  return { ref, shown, style };
}
