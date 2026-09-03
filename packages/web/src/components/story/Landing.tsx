"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { PoolStats } from "@/lib/chain/read";
import { Wordmark } from "@/components/ui";

const HearthStory = dynamic(() => import("./HearthStory").then((module) => module.HearthStory), {
  ssr: false,
});

export function Landing({ stats }: { stats: PoolStats | null }) {
  return (
    <main className="grain relative bg-ink">
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-5 lg:px-10">
        <Link href="/" className="pointer-events-auto" aria-label="Hearth, home">
          <Wordmark size={19} />
        </Link>

        <nav className="pointer-events-auto flex items-center gap-3">
          <Link
            href="/how"
            prefetch
            className="hidden text-[13px] text-white/55 transition-colors hover:text-white sm:block"
          >
            How it works
          </Link>
          <Link
            href="/app"
            prefetch
            className="rounded-lg bg-flameFill px-4 py-2 text-sm font-medium text-onFlame transition-transform duration-200 hover:scale-[1.03]"
          >
            Open the pool
          </Link>
        </nav>
      </header>

      <HearthStory stats={stats} />
    </main>
  );
}
