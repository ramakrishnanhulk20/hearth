"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { PoolStats } from "@/lib/chain/pool";
import { LanguagePicker } from "@/components/LanguagePicker";
import { useMessages } from "@/i18n/LocaleProvider";

const StoryExperience = dynamic(
  () => import("./StoryExperience").then((m) => m.StoryExperience),
  { ssr: false },
);

export function StoryLanding({ stats }: { stats: PoolStats | null }) {
  const m = useMessages();

  return (
    <main className="force-dark relative bg-ink">
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-6 lg:px-10">
        <a href="/" className="pointer-events-auto flex items-center gap-3" aria-label="Lantern, home">
          <span className="relative block h-[18px] w-[13px]">
            <span className="absolute inset-x-0 bottom-0 top-[3px] rounded-[3px] border border-flame/70 bg-flame/15" />
            <span className="absolute left-1/2 top-0 h-[5px] w-[7px] -translate-x-1/2 rounded-t-full border border-b-0 border-flame/70" />
          </span>
          <span className="font-display text-[19px] tracking-[-0.02em] text-white" style={{ fontWeight: 680 }}>
            Lantern
          </span>
        </a>

        <nav className="pointer-events-auto flex items-center gap-3">
          <Link
            href="/app"
            prefetch
            className="rounded-lg bg-flameFill px-4 py-2 text-sm font-medium text-onFlame transition-transform duration-200 hover:scale-[1.03]"
          >
            {m.nav.openApp}
          </Link>
          <LanguagePicker />
        </nav>
      </header>

      <StoryExperience stats={stats} />
    </main>
  );
}
