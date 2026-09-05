"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/ui";
import { LanguagePicker } from "@/components/LanguagePicker";
import { PoolPicker } from "@/components/app/PoolPicker";
import { useCurrentPool } from "@/components/app/PoolProvider";
import { Link, usePathname } from "@/i18n/navigation";
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
  /** A key in `console.sidebar`, so the rail reads in the language the console is set to. */
  label: string;
  icon: ReactNode;
  /** A word at the end of the row. Used once, for the step anybody is allowed to run. */
  chip?: { text: string; title: string };
};

/** Every console link carries the pool, so a saver never loses their token by using the rail. */
function navFor(slug: string): NavItem[] {
  const base = `/app/${slug}`;
  return [
    { href: base, label: "dashboard", icon: <DashboardIcon /> },
    { href: `${base}/deposit`, label: "deposit", icon: <DepositIcon /> },
    { href: `${base}/withdraw`, label: "withdraw", icon: <WithdrawIcon /> },
    { href: `${base}/draws`, label: "draws", icon: <DrawsIcon /> },
    {
      href: `${base}/run`,
      label: "run",
      icon: <RunIcon />,
      chip: { text: "anyone", title: "anyoneTitle" },
    },
  ];
}

/** The dashboard is the only route that is a prefix of the others, so it matches exactly. */
function isHere(pathname: string, href: string, base: string): boolean {
  return href === base ? pathname === base : pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("console.sidebar");
  const chrome = useTranslations("chrome");
  const pathname = usePathname();
  const { slug } = useCurrentPool();
  const base = `/app/${slug}`;
  const NAV = navFor(slug);
  const SECONDARY = [
    { href: "/docs", label: "docs", icon: <DocsIcon size={16} /> },
    { href: `/verify?pool=${slug}`, label: "verify", icon: <VerifyIcon size={16} /> },
  ];

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        aria-label={chrome("home")}
        onClick={onNavigate}
        className="mb-6 inline-flex px-3.5 pt-1.5"
      >
        <Wordmark size={19} />
      </Link>

      <nav aria-label={t("nav")} className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const here = isHere(pathname, item.href, base);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={here ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-lg py-2.5 pe-2.5 ps-3.5 text-[13.5px] transition-colors ${
                here
                  ? "ember-lit font-medium text-flameInk"
                  : "text-muted hover:bg-hover hover:text-parchment"
              }`}
            >
              <span
                className={
                  here ? "text-flameInk" : "text-faint transition-colors group-hover:text-muted"
                }
              >
                {item.icon}
              </span>
              <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
              {item.chip && (
                <span
                  title={t(item.chip.title)}
                  className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.06em] ${
                    here ? "border-flame/45 text-flameInk" : "border-hairline text-muted"
                  }`}
                >
                  {t(item.chip.text)}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="mt-6 flex flex-col gap-0.5 border-t border-hairline pt-3">
        {SECONDARY.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="group flex items-center gap-3 rounded-lg py-2 pe-2.5 ps-3.5 text-[13px] text-muted transition-colors hover:bg-hover hover:text-parchment"
          >
            <span className="text-faint transition-colors group-hover:text-muted">{item.icon}</span>
            {t(item.label)}
          </Link>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <PoolPicker />
        <LanguagePicker />
        <NetworkChip />
        <WalletChip />
      </div>
    </div>
  );
}
