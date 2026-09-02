"use client";

import type { ReactNode } from "react";
import { useReveal } from "@/hooks/useScroll";

export function Reveal({
  children,
  index = 0,
  className = "",
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  const { ref, shown, style } = useReveal<HTMLDivElement>(index);

  return (
    <div
      ref={ref}
      style={style}
      className={`transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}
