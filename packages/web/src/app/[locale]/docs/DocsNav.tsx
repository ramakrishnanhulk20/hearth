"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { DocSection, SearchRow } from "@/lib/docs/types";
import { sectionName } from "./sectionName";

const MAX_RESULTS = 12;

function score(row: SearchRow, needle: string): number {
  const heading = row.heading?.toLowerCase() ?? "";
  const title = row.title.toLowerCase();

  if (row.heading === null) {
    if (title.startsWith(needle)) return 0;
    if (title.includes(needle)) return 1;
    return row.section.toLowerCase().includes(needle) ? 4 : -1;
  }

  if (heading.startsWith(needle)) return 2;
  if (heading.includes(needle)) return 3;
  return -1;
}

export function DocsNav({
  sections,
  search,
  onNavigate,
  autoFocus = false,
}: {
  sections: DocSection[];
  search: SearchRow[];
  onNavigate?: () => void;
  autoFocus?: boolean;
}) {
  const t = useTranslations("docs");
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return null;

    return search
      .map((row) => ({ row, rank: score(row, needle) }))
      .filter((hit) => hit.rank >= 0)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, MAX_RESULTS)
      .map((hit) => hit.row);
  }, [query, search]);

  // The rail is taller than the screen, so a page near the bottom of it has to be brought into view.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  // "/" anywhere on the page jumps into search, the shortcut every documentation site has.
  useEffect(() => {
    if (!autoFocus) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [autoFocus]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setQuery("");
      inputRef.current?.blur();
      return;
    }
    if (!results || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((at) => (at + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((at) => (at - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const hit = results[cursor];
      if (!hit) return;
      setQuery("");
      onNavigate?.();
      router.push(hit.href);
    }
  };

  return (
    <div>
      <div className="docs-search">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={t("search")}
          aria-label={t("search")}
          className="docs-search-input"
        />
        {query.length === 0 && autoFocus && <span className="docs-search-key">/</span>}
      </div>

      {results ? (
        <div className="docs-results">
          {results.length === 0 && <p className="docs-result-empty">{t("noResults")}</p>}
          {results.map((row, index) => (
            <Link
              key={`${row.href}-${index}`}
              href={row.href}
              data-cursor={index === cursor}
              className="docs-result"
              onMouseEnter={() => setCursor(index)}
              onClick={() => {
                setQuery("");
                onNavigate?.();
              }}
            >
              <span className="docs-result-heading">{row.heading ?? row.title}</span>
              <span className="docs-result-page">
                {row.heading
                  ? `${sectionName(t, row.section)} · ${row.title}`
                  : sectionName(t, row.section)}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <nav aria-label={t("nav")}>
          {sections.map((section) => (
            <div key={section.name} className="docs-nav-section">
              <p className="docs-nav-label">{sectionName(t, section.name)}</p>
              <div className="docs-nav-list">
                {section.pages.map((page) => (
                  <Link
                    key={page.slug}
                    ref={pathname === page.href ? activeRef : undefined}
                    href={page.href}
                    data-active={pathname === page.href}
                    className="docs-nav-link"
                    onClick={onNavigate}
                  >
                    {page.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}
