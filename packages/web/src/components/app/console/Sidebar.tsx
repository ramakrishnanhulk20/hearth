"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/ui";
import {
  DashboardIcon,
  DepositIcon,
  DocsIcon,
  DrawsIcon,
  RunIcon,
  VerifyIcon,
  WithdrawIcon,
} from "./icons";
import { NetworkChip, WalletChip } from "./WalletChip";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  /** A word on the right of the row. Used once, for the step anybody is allowed to run. */
  chip?: { text: string; title: string };
};

const NAV: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/app/deposit", label: "Deposit", icon: <DepositIcon /> },
  { href: "/app/withdraw", label: "Withdraw", icon: <WithdrawIcon /> },
  { href: "/app/draws", label: "My draws", icon: <DrawsIcon /> },
  { href: "/app/run", label: "Run a draw", icon: <RunIcon />, chip: { text: "Anyone", title: "Every step of a draw is callable by any wallet" } },
];

const SECONDARY = [
  { href: "/docs", label: "Docs", icon: <DocsIcon size={16} /> },
  { href: "/verify", label: "Verify", icon: <VerifyIcon size={16} /> },
];

/** The dashboard is the only route that is a prefix of the others, so it matches exactly. */
function isHere(pathname: string, href: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        aria-label="Hearth, home"
        onClick={onNavigate}
        className="mb-6 inline-flex px-2.5 pt-1.5"
      >
        <Wordmark size={19} />
      </Link>

      <nav aria-label="Console" className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const here = isHere(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={here ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-[13.5px] transition-colors ${
                here
                  ? "bg-flame/25 font-medium text-parchment"
                  : "text-muted hover:bg-hover hover:text-parchment"
              }`}
            >
              <span className={here ? "text-flameInk" : "text-faint"}>{item.icon}</span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.chip && (
                <span
                  title={item.chip.title}
                  className="shrink-0 rounded-full border border-hairline px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-muted"
                >
                  {item.chip.text}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="mt-6 flex flex-col gap-0.5 border-t border-hairlineSoft pt-3">
        {SECONDARY.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] text-muted transition-colors hover:bg-hover hover:text-parchment"
          >
            <span className="text-faint">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <NetworkChip />
        <WalletChip />
      </div>
    </div>
  );
}
