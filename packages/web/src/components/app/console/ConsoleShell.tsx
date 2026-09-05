"use client";

import { useTranslations } from "next-intl";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { Wordmark } from "@/components/ui";
import { LanguagePicker } from "@/components/LanguagePicker";
import { PoolPicker } from "@/components/app/PoolPicker";
import { usePathname } from "@/i18n/navigation";
import { useDialogFocus } from "@/hooks/useDialogFocus";
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
  const t = useTranslations("console.shell");
  const pathname = usePathname();

  // The drawer remembers the route it was opened on rather than a bare boolean, so any
  // navigation closes it, the back button included, without an effect that chases the pathname.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const drawerOpen = openedAt !== null && openedAt === pathname;
  const closeDrawer = useCallback(() => setOpenedAt(null), []);

  return (
    <div className="min-h-[100svh]">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[278px] p-3.5 lg:block">
        <div className="panel-glare h-full overflow-y-auto rounded-card border border-hairline bg-surface px-3.5 py-4">
          <Sidebar />
        </div>
      </aside>

      <div className="sticky top-0 z-30 bg-ink px-3 pb-2 pt-3 lg:hidden">
        <div className="panel-glare flex items-center gap-2 rounded-card border border-hairline bg-surface px-2.5 py-2.5">
          <button
            type="button"
            onClick={() => setOpenedAt(pathname)}
            aria-label={t("openMenu")}
            aria-expanded={drawerOpen}
            className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors after:absolute after:-inset-1 after:content-[''] hover:bg-hover hover:text-parchment"
          >
            <MenuIcon size={19} />
          </button>
          {/* The wordmark steps aside below the smallest breakpoint. The token and the wallet are
              the two things this bar exists to show, and the drawer carries the mark anyway. */}
          <span className="hidden min-w-0 flex-1 overflow-hidden sm:block">
            <Wordmark size={16} />
          </span>
          <span className="min-w-0 flex-1 sm:max-w-[9.5rem] sm:flex-none">
            <PoolPicker compact />
          </span>
          {/* The globe alone below the smallest breakpoint, and the language name beside it above
              one. It sits next to the token because the two are the same kind of control: what
              this screen is about, and what it is written in. */}
          <span className="shrink-0">
            <LanguagePicker compact />
          </span>
          <span className="w-[124px] shrink-0 sm:w-[152px]">
            <WalletChip placement="down" />
          </span>
        </div>
      </div>

      <main className="lg:ps-[278px]">
        <div className="mx-auto w-full max-w-[62rem] px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          <ConsoleBanners />
          {children}
        </div>
      </main>

      {drawerOpen && (
        <Drawer label={t("menuLabel")} onClose={closeDrawer}>
          <Sidebar onNavigate={closeDrawer} />
        </Drawer>
      )}
    </div>
  );
}

/** The rail on a narrow screen. The keyboard behaviour is the shared dialog one. */
function Drawer({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("console.shell");
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(panelRef, onClose, true);

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
        className="panel-glare absolute inset-y-0 start-0 flex w-[278px] max-w-[86vw] flex-col overflow-y-auto border-e border-hairline bg-surface px-3.5 py-4"
      >
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closeMenu")}
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors after:absolute after:-inset-1.5 after:content-[''] hover:bg-hover hover:text-parchment"
          >
            <CloseIcon size={17} />
          </button>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
