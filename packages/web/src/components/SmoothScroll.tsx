"use client";

import { useSmoothScroll } from "@/hooks/useScroll";

/** Drops Lenis onto a server-rendered reading page without making the whole page a client one. */
export function SmoothScroll() {
  useSmoothScroll();
  return null;
}
