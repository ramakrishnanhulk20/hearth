"use client";

import { useEffect, useState } from "react";
import type { Heading } from "@/lib/docs/types";

/** Distance below the sticky header at which a heading counts as the one being read. */
const READING_LINE = 140;

export function Outline({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    if (headings.length === 0) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      let current = headings[0].id;
      for (const heading of headings) {
        const element = document.getElementById(heading.id);
        if (!element) continue;
        if (element.getBoundingClientRect().top <= READING_LINE) current = heading.id;
      }

      // At the very bottom the last heading may never cross the line, so claim it outright.
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 8) {
        current = headings[headings.length - 1].id;
      }

      setActive(current);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <aside className="docs-outline">
      <p className="docs-outline-label">On this page</p>
      <div className="docs-outline-list">
        {headings.map((heading) => (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            data-depth={heading.depth}
            data-active={active === heading.id}
            className="docs-outline-link"
            onClick={(event) => {
              const element = document.getElementById(heading.id);
              if (!element) return;
              event.preventDefault();
              setActive(heading.id);
              window.history.replaceState(null, "", `#${heading.id}`);
              const gentle = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              element.scrollIntoView({ behavior: gentle ? "auto" : "smooth", block: "start" });
            }}
          >
            {heading.text}
          </a>
        ))}
      </div>
    </aside>
  );
}
