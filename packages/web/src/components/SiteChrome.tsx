"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, MenuIcon } from "@/components/app/console/icons";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguagePicker } from "./LanguagePicker";
import { Wordmark } from "./ui";

const LINKS = [
  { href: "/app", label: "pool" },
  { href: "/verify", label: "verify" },
  { href: "/how", label: "how" },
  { href: "/docs", label: "docs" },
] as const;

export function SiteHeader({ right, sticky = true }: { right?: ReactNode; sticky?: boolean }) {
  const t = useTranslations("chrome");

  return (
    <header
      className={`${sticky ? "sticky top-0" : ""} z-40 border-b border-hairlineSoft bg-[rgba(5,5,5,0.72)] backdrop-blur-xl`}
    >
      <div className="mx-auto flex w-full max-w-[76rem] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link href="/" aria-label={t("home")} className="shrink-0">
          <Wordmark size={18} />
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="hidden items-center gap-5 md:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[13px] text-faint transition-colors hover:text-parchment"
              >
                {t(`nav.${link.label}`)}
              </Link>
            ))}
          </nav>
          {/* The language stays in the bar at every width. It is the one control a reader who
              cannot read the page needs, and burying it behind a menu labelled in a language
              they do not read would be the wrong place for it. */}
          <LanguagePicker compact />
          {right}
          <HeaderMenu />
        </div>
      </div>
    </header>
  );
}

/**
 * The four links, on a screen too narrow to lay them out.
 *
 * Below the medium breakpoint the row above collapses, and until now it collapsed into nothing:
 * a reader on a phone could reach /how, /verify, /docs and the pool only through the footer at
 * the bottom of the page. This is the same object the console rail opens on a phone, with the
 * same keyboard behaviour, dropped from under the bar rather than pushed in from the side.
 */
function HeaderMenu() {
  const t = useTranslations("chrome");
  const pathname = usePathname();

  // The console rail does the same: remembering the route the menu was opened on means any
  // navigation closes it, the back button included, with no effect chasing the pathname.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt !== null && openedAt === pathname;
  const close = useCallback(() => setOpenedAt(null), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenedAt(pathname)}
        aria-label={t("menu.open")}
        aria-expanded={open}
        className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-parchment md:hidden"
      >
        <MenuIcon size={19} />
      </button>
      {open && <MenuSheet onClose={close} />}
    </>
  );
}

function MenuSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations("chrome");
  const panelRef = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  useDialogFocus(panelRef, onClose, true);

  const sheet = still
    ? {}
    : {
        initial: { y: -14, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const },
      };

  // Out to the body rather than into the header. The bar blurs what is behind it, and an element
  // that blurs its backdrop becomes the frame every fixed child measures itself against, so a
  // sheet left inside it would be trapped in a strip fifty pixels tall.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("menu.label")}
      className="fixed inset-0 z-50 md:hidden"
    >
      {/* Tapping the page behind closes the sheet. Escape and the close button do the keyboard
          half of that job, so this one stays out of the tab order. */}
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-scrim"
      />
      <motion.div
        ref={panelRef}
        {...sheet}
        className="grain panel-glare absolute inset-x-0 top-0 border-b border-hairline bg-surface px-4 pb-9 pt-3.5 sm:px-6"
      >
        <div className="flex items-center justify-between gap-4">
          <Wordmark size={18} />
          <button
            type="button"
            onClick={onClose}
            aria-label={t("menu.close")}
            className="relative -me-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-parchment"
          >
            <CloseIcon size={17} />
          </button>
        </div>

        <nav className="mt-7 flex flex-col">
          {LINKS.map((link, index) => (
            <motion.span
              key={link.href}
              initial={still ? undefined : { y: 12, opacity: 0 }}
              animate={still ? undefined : { y: 0, opacity: 1 }}
              transition={
                still ? undefined : { duration: 0.36, delay: 0.06 + index * 0.05, ease: [0.22, 1, 0.36, 1] }
              }
            >
              <Link
                href={link.href}
                onClick={onClose}
                className="block border-b border-hairlineSoft py-3.5 font-display text-[clamp(1.6rem,7vw,2.1rem)] leading-[1.05] tracking-tightest text-parchment transition-colors last:border-b-0 hover:text-flameInk"
                style={{ fontWeight: 640 }}
              >
                {t(`nav.${link.label}`)}
              </Link>
            </motion.span>
          ))}
        </nav>
      </motion.div>
    </div>,
    document.body,
  );
}

export function SiteFooter() {
  const t = useTranslations("chrome");

  return (
    <footer className="border-t border-hairlineSoft px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-4 text-[12.5px] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-faint">
          <Wordmark size={14} />
          <span className="hidden sm:inline text-faint/50">·</span>
          <span>{t("footer.tagline")}</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-muted transition-colors hover:text-parchment">
              {t(`nav.${link.label}`)}
            </Link>
          ))}
          <a
            href="https://docs.zama.ai/protocol"
            target="_blank"
            rel="noopener noreferrer"
            className="text-flame/80 transition-colors hover:text-flame"
          >
            {t("footer.zama")}
          </a>
        </nav>
      </div>
      <p className="mx-auto mt-5 w-full max-w-[76rem] text-[12px] leading-relaxed text-faint">
        {t("footer.disclaimer")}
      </p>
    </footer>
  );
}
