"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Everything a covering panel owes a keyboard.
 *
 * Tab is held inside the panel while it is open, because somebody who tabs out of a menu that
 * covers the page is left operating a page they cannot see. Escape closes it the way every other
 * dialog on the web does, the page behind it stops scrolling under a thumb, and when the panel
 * goes the focus goes back to the control that opened it rather than to the top of the document.
 *
 * The console rail and the docs contents both open one of these, and they used to disagree about
 * how much of that they did.
 */
export function useDialogFocus(panel: RefObject<HTMLElement | null>, onClose: () => void, open: boolean) {
  useEffect(() => {
    if (!open) return;
    const node = panel.current;
    if (!node) return;

    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );

    focusable()[0]?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !node.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      returnTo?.focus();
    };
  }, [panel, onClose, open]);
}
