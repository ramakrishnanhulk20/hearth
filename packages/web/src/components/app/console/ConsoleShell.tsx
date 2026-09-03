"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Wordmark } from "@/components/ui";
import { ConsoleBanners } from "./ConsoleBanners";
import { CloseIcon, MenuIcon } from "./icons";
import { Sidebar } from "./Sidebar";
import { WalletChip } from "./WalletChip";

/**
 * The frame every screen under /app sits in: the rail on the left, the warnings and then one
 * task on the right.
 *
 * The rail is a floating panel rather than a full-height column so the ground and its grain show
 * around it, which is what stops the console reading as one flat dark slab.
 *
 * It wears the card radius rather than one of its own, because to a reader it is the same object
 * as the panels beside it: a lit surface standing off the black.
 */
export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // The drawer remembers the route it was opened on rather than a bare boolean, so any
  // navigation closes it, the back button included, without an effect that chases the pathname.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const drawerOpen = openedAt !== null && openedAt === pathname;
  const closeDrawer = useCallback(() => setOpenedAt(null), []);

  return (
    <div className="min-h-[100svh]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[278px] p-3.5 lg:block">
        <div className="panel-glare h-full overflow-y-auto rounded-card border border-hairline bg-surface px-3.5 py-4">
          <Sidebar />
        </div>
      </aside>

      <div className="sticky top-0 z-30 bg-ink px-3 pb-2 pt-3 lg:hidden">
        <div className="panel-glare flex items-center gap-2 rounded-card border border-hairline bg-surface px-2.5 py-2.5">
          <button
            type="button"
            onClick={() => setOpenedAt(pathname)}
            aria-label="Open the console menu"
            aria-expanded={drawerOpen}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-parchment"
          >
            <MenuIcon size={19} />
          </button>
          <span className="min-w-0 flex-1 overflow-hidden">
            <Wordmark size={16} />
          </span>
          <span className="w-[152px] shrink-0">
            <WalletChip placement="down" />
          </span>
        </div>
      </div>

      <main className="lg:pl-[278px]">
        <div className="mx-auto w-full max-w-[62rem] px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          <ConsoleBanners />
          {children}
        </div>
      </main>

      {drawerOpen && (
        <Drawer label="Console menu" onClose={closeDrawer}>
          <Sidebar onNavigate={closeDrawer} />
        </Drawer>
      )}
    </div>
  );
}

/**
 * The rail on a narrow screen.
 *
 * Tab is held inside the panel while it is open, because a keyboard reader who tabs out of a
 * covering menu is left operating a page they cannot see, and Escape closes it the way every
 * other dialog on the web does.
 */
function Drawer({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);

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

      if (event.shiftKey && (active === first || !panel.contains(active))) {
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
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-50 lg:hidden">
      {/* Tapping the page behind closes the drawer. Escape and the close button do the keyboard
          half of that job, so this one stays out of the tab order. */}
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-scrim"
      />
      <div
        ref={panelRef}
        className="panel-glare absolute inset-y-0 left-0 flex w-[278px] max-w-[86vw] flex-col overflow-y-auto border-r border-hairline bg-surface px-3.5 py-4"
      >
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the console menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-parchment"
          >
            <CloseIcon size={17} />
          </button>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
