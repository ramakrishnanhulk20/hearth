"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { DocSection, SearchRow } from "@/lib/docs/types";
import { DocsNav } from "./DocsNav";

function MenuIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
      <path d="M2 4h12M2 8h12M2 12h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function DocsShell({
  sections,
  search,
  children,
}: {
  sections: DocSection[];
  search: SearchRow[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const here =
    sections.flatMap((section) => section.pages).find((page) => page.href === pathname)?.title ??
    "Overview";

  useEffect(() => {
    if (!drawerOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    // The drawer covers the page, so the page behind it must not scroll under the reader's thumb.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  return (
    <div className="docs-root">
      <div className="docs-bar">
        <button type="button" className="docs-bar-button" onClick={() => setDrawerOpen(true)}>
          <MenuIcon />
          Contents
        </button>
        <span className="docs-bar-here">{here}</span>
      </div>

      <div className="docs-grid">
        <aside className="docs-rail">
          <DocsNav sections={sections} search={search} autoFocus />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>

      {drawerOpen && (
        <div className="docs-drawer" role="dialog" aria-modal="true" aria-label="Documentation contents">
          <div className="docs-drawer-scrim" onClick={() => setDrawerOpen(false)} />
          <div className="docs-drawer-panel">
            <div className="mb-4 flex items-center justify-between">
              <span className="docs-nav-label">Contents</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="text-[12px] text-faint transition-colors hover:text-parchment"
              >
                Close
              </button>
            </div>
            <DocsNav sections={sections} search={search} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
