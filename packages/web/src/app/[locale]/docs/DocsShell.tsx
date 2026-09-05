"use client";

import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { useDialogFocus } from "@/hooks/useDialogFocus";
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
  const t = useTranslations("docs");
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const here =
    sections.flatMap((section) => section.pages).find((page) => page.href === pathname)?.title ??
    t("overview");

  // The same trap the console rail uses. This drawer had Escape and a locked page but nothing
  // holding Tab, so a reader could tab out of a menu covering the whole screen, and nothing sent
  // focus back to the button that opened it.
  useDialogFocus(drawerRef, closeDrawer, drawerOpen);

  return (
    <div className="docs-root">
      <div className="docs-bar">
        <button type="button" className="docs-bar-button" onClick={() => setDrawerOpen(true)}>
          <MenuIcon />
          {t("contents")}
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
        <div className="docs-drawer" role="dialog" aria-modal="true" aria-label={t("contents")}>
          <div className="docs-drawer-scrim" onClick={closeDrawer} />
          <div ref={drawerRef} className="docs-drawer-panel">
            <div className="mb-4 flex items-center justify-between">
              <span className="docs-nav-label">{t("contents")}</span>
              <button
                type="button"
                onClick={closeDrawer}
                className="text-[12px] text-faint transition-colors hover:text-parchment"
              >
                {t("close")}
              </button>
            </div>
            <DocsNav sections={sections} search={search} onNavigate={closeDrawer} />
          </div>
        </div>
      )}
    </div>
  );
}
