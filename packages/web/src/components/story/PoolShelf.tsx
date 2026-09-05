"use client";

import { useTranslations } from "next-intl";
import type { PoolPrize } from "@/lib/chain/read";
import { Link } from "@/i18n/navigation";
import { useFormat } from "@/hooks/useFormat";

/**
 * Every token Hearth saves in, with the prize sitting on it right now.
 *
 * The figures are read on the server in one multicall and shipped inside the page, so the row is
 * already filled in when the story closes rather than filling in afterwards. A pool whose read
 * did not answer says so on its own cell instead of printing a zero, because a zero jackpot and
 * an unanswered node look identical once one is written down.
 */
export function PoolShelf({ pools }: { pools: PoolPrize[] }) {
  const t = useTranslations("landing.shelf");
  const format = useFormat();

  if (pools.length === 0) return null;

  return (
    <div className="mt-10 border-t border-white/10 pt-6">
      <p className="label mb-4">{t("heading")}</p>

      <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pools.map((entry) => (
          <Link
            key={entry.slug}
            href={`/app/${entry.slug}`}
            prefetch={false}
            title={entry.name}
            className="group relative shrink-0 snap-start rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 transition-colors duration-200 hover:border-flame/45 hover:bg-flame/[0.06] focus-visible:border-flame/60 focus-visible:outline-none"
          >
            <span className="block text-[12px] uppercase tracking-label text-white/55 transition-colors duration-200 group-hover:text-white/70">
              {entry.symbol}
            </span>
            <span
              className="mt-1.5 block font-display text-[19px] leading-none tabular-nums tracking-tight text-white/85 transition-colors duration-200 group-hover:text-flame"
              style={{ fontWeight: 640 }}
            >
              {entry.grand === null ? t("unread") : format.amount(entry.grand, entry.decimals)}
            </span>
            {/* The lit underline is the same move the console makes on the row you are standing
                on, so the two halves of the product share one gesture. */}
            <span
              aria-hidden
              className="absolute inset-x-4 bottom-0 h-px origin-[left] scale-x-0 bg-flame/70 transition-transform duration-300 group-hover:scale-x-100 rtl:origin-[right]"
            />
          </Link>
        ))}
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-white/55">{t("note")}</p>
    </div>
  );
}
