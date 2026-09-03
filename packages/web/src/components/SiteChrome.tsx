"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "./ui";

const LINKS = [
  { href: "/app", label: "The pool" },
  { href: "/verify", label: "Verify" },
  { href: "/how", label: "How it works" },
  { href: "/docs", label: "Docs" },
];

export function SiteHeader({ right, sticky = true }: { right?: ReactNode; sticky?: boolean }) {
  return (
    <header
      className={`${sticky ? "sticky top-0" : ""} z-40 border-b border-hairlineSoft bg-[rgba(5,5,5,0.72)] backdrop-blur-xl`}
    >
      <div className="mx-auto flex w-full max-w-[76rem] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link href="/" aria-label="Hearth, home" className="shrink-0">
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
                {link.label}
              </Link>
            ))}
          </nav>
          {right}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-hairlineSoft px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-4 text-[12.5px] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-faint">
          <Wordmark size={14} />
          <span className="hidden sm:inline text-faint/50">·</span>
          <span>Confidential no-loss prize savings</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-muted transition-colors hover:text-parchment">
              {link.label}
            </Link>
          ))}
          <a
            href="https://docs.zama.ai/protocol"
            target="_blank"
            rel="noopener noreferrer"
            className="text-flame/80 transition-colors hover:text-flame"
          >
            Built on the Zama Protocol
          </a>
        </nav>
      </div>
      <p className="mx-auto mt-5 w-full max-w-[76rem] text-[12px] leading-relaxed text-faint">
        A demonstration on the Sepolia test network. The tokens are test tokens with no value, the yield
        is a sponsor-funded balance rather than a real strategy, and nothing here is financial advice.
      </p>
    </footer>
  );
}
