"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { ChevronIcon, GlobeIcon } from "@/components/app/console/icons";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALES, localeEntry } from "@/i18n/routing";

/**
 * The same page, in another language.
 *
 * It wears the pool picker's panel on purpose: two lists that swap what a screen is about should
 * not be two different objects, and a reader who has met one already knows how the other works.
 * Picking is a navigation and never a reload of a different site: the path stays where it was,
 * the query string with it, and next-intl writes the cookie so the next visit opens the same way.
 *
 * Every row is written in its own language. Somebody looking for Tamil is looking for தமிழ், not
 * for the English word, and a list of English names is a list nobody can scan.
 */
export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  // Same convention as the pool picker: compact is the bar at the top of a page, where the list
  // drops down, and the default is the console rail, where it has to open upwards or it would
  // run off the bottom of the window.
  const t = useTranslations("chrome.language");
  const locale = useLocale();
  const current = localeEntry(locale);
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // The picker sits in the landing header and again in the console bar, so the id the trigger
  // points at is generated rather than written down.
  const listId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // The row you are standing on takes focus when the list opens, so the arrow keys start from the
  // language you are reading rather than from the top of a list of sixteen.
  useEffect(() => {
    if (!open) return;
    const selected = listRef.current?.querySelector<HTMLElement>('[data-selected="true"]');
    (selected ?? listRef.current?.querySelector<HTMLElement>("[data-row]"))?.focus();
  }, [open]);

  const go = (code: string) => {
    setOpen(false);
    if (code === locale) return;
    // Read straight off the address bar rather than through useSearchParams, which would force a
    // Suspense boundary onto every statically rendered page the header sits on. Verify and the lab
    // both carry ?pool=, and losing it would silently move the reader to another token.
    const query = typeof window === "undefined" ? "" : window.location.search;
    const href = `${pathname}${query}`;
    startTransition(() => router.replace(href, { locale: code }));
  };

  const onListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-row]") ?? []);
    if (rows.length === 0) return;
    const index = rows.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === "ArrowDown"
        ? rows[(index + 1) % rows.length]
        : event.key === "ArrowUp"
          ? rows[(index - 1 + rows.length) % rows.length]
          : event.key === "Home"
            ? rows[0]
            : event.key === "End"
              ? rows[rows.length - 1]
              : null;
    if (!next) return;
    event.preventDefault();
    next.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={t("trigger", { name: current.name })}
        // The globe measures 38 by 34 on a phone, where it is the whole control. The invisible
        // square around it clears the 44 a thumb needs, and it costs no space in the bar. Eight
        // rather than five: the bar's own edge takes a pixel or two off the bottom of it.
        className={`group relative flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-start transition-colors after:absolute after:-inset-2 after:content-[''] ${
          compact ? "sm:w-auto" : ""
        } ${
          open
            ? "border-flame/45 bg-flame/[0.08]"
            : "border-hairline bg-raised hover:border-hairlineStrong hover:bg-hover"
        }`}
      >
        <span className="shrink-0 text-flameInk">
          <GlobeIcon size={16} />
        </span>
        {/* Below the smallest breakpoint the globe is the whole control. Sixteen native names run
            from two characters to eighteen, so the widest of them would push the wallet chip off
            a 375 pixel bar on its own. */}
        <span
          className={`min-w-0 flex-1 truncate text-[13px] text-parchment ${compact ? "hidden sm:block" : ""}`}
        >
          {current.name}
        </span>
        <span
          className={`shrink-0 text-faint transition-transform duration-200 ${
            compact ? "hidden sm:block" : ""
          } ${open ? "rotate-180" : ""}`}
        >
          <ChevronIcon size={14} />
        </span>
      </button>

      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={t("list")}
          onKeyDown={onListKeyDown}
          // Hung off the end edge, which is the right on an English page and the left on an Arabic
          // one. The button is narrower than the panel, so anchoring the other way runs it off a
          // 375 pixel screen. Two hundred pixels below the smallest breakpoint rather than two
          // hundred and twenty four: the trigger sits about forty pixels in from the far edge of a
          // 375 pixel bar, and the wider panel put its own far side four pixels past the other one.
          className={`panel-glare absolute end-0 z-50 max-h-[70vh] overflow-y-auto rounded-card border border-hairlineStrong bg-surface p-1.5 shadow-popover ${
            compact
              ? "top-[calc(100%+6px)] w-[12.5rem] max-w-[calc(100vw-1.5rem)] sm:w-[14rem]"
              : "bottom-[calc(100%+6px)] w-full"
          }`}
        >
          <p className="px-2.5 pb-1.5 pt-1 text-[10.5px] uppercase tracking-label text-faint">
            {t("heading")}
          </p>

          {LOCALES.map((entry) => {
            const selected = entry.code === locale;
            return (
              <div
                key={entry.code}
                id={`${listId}-${entry.code}`}
                data-row
                data-selected={selected}
                role="option"
                aria-selected={selected}
                lang={entry.code}
                tabIndex={-1}
                onClick={() => go(entry.code)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    go(entry.code);
                  }
                }}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 outline-none transition-colors focus-visible:ring-1 focus-visible:ring-flame/50 ${
                  selected ? "ember-lit" : "hover:bg-hover focus-visible:bg-hover"
                }`}
              >
                <span
                  className={`min-w-0 flex-1 truncate text-[13px] ${
                    selected ? "font-medium text-flameInk" : "text-parchment"
                  }`}
                >
                  {entry.name}
                </span>
                <span
                  className={`shrink-0 text-[10.5px] uppercase tracking-label ${
                    selected ? "text-flameInk" : "text-faint"
                  }`}
                >
                  {selected ? t("current") : entry.code}
                </span>
              </div>
            );
          })}

          <p className="px-2.5 pb-1 pt-2 text-[11.5px] leading-relaxed text-faint">{t("note")}</p>
        </div>
      )}
    </div>
  );
}
