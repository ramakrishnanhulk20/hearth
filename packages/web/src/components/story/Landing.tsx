"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { PoolPrize, PoolStats } from "@/lib/chain/read";
import { Link } from "@/i18n/navigation";
import { LanguagePicker } from "@/components/LanguagePicker";
import { Wordmark } from "@/components/ui";

const HearthStory = dynamic(() => import("./HearthStory").then((module) => module.HearthStory), {
  ssr: false,
});

export function Landing({ stats, pools }: { stats: PoolStats | null; pools: PoolPrize[] }) {
  const t = useTranslations("landing.header");
  const chrome = useTranslations("chrome");

  return (
    <main className="grain relative bg-ink">
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-5 lg:px-10">
        <Link href="/" className="pointer-events-auto" aria-label={chrome("home")}>
          <Wordmark size={19} />
        </Link>

        <nav className="pointer-events-auto flex items-center gap-3">
          {/* Kept at every width. It was hidden below the smallest breakpoint, which left a
              phone with a story it could scroll and no way to read the plain-English version of
              it. The type steps down instead of the link going away. */}
          <Link
            href="/how"
            prefetch
            className="whitespace-nowrap text-[12px] text-white/55 transition-colors hover:text-white sm:text-[13px]"
          >
            {t("how")}
          </Link>
          <LanguagePicker compact />
          <Link
            href="/app"
            prefetch
            className="rounded-lg bg-flameFill px-4 py-2 text-sm font-medium text-onFlame transition-transform duration-200 hover:scale-[1.03]"
          >
            {t("open")}
          </Link>
        </nav>
      </header>

      <HearthStory stats={stats} pools={pools} />
    </main>
  );
}
