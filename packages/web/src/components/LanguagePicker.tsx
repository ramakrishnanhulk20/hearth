"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALE_NAMES, LOCALES } from "@/i18n/config";
import { useLocale, useMessages } from "@/i18n/LocaleProvider";

export function LanguagePicker() {
  const { locale, setLocale } = useLocale();
  const m = useMessages();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={m.language.label}
        aria-expanded={open}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-hairline px-2.5 text-[13px] text-muted transition-colors duration-200 hover:border-hairlineStrong hover:text-parchment"
      >
        <GlobeIcon />
        <span className="tabular-nums">{LOCALE_NAMES[locale]}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-40 overflow-hidden rounded-lg border border-hairline bg-surface p-1 shadow-glass">
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setLocale(code);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
                code === locale ? "bg-hover text-flame" : "text-parchment hover:bg-hover"
              }`}
            >
              {LOCALE_NAMES[code]}
              {code === locale && <CheckIcon />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
