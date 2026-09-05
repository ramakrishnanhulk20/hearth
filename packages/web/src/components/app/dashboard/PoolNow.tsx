"use client";

import { useTranslations } from "next-intl";
import { CAP_LABEL, CARD_NOTE, Card, CardPill, Countdown, Stat, Unknown } from "@/components/app/console";
import { TIER_KEYS } from "@/lib/chain/addresses";
import { useFormat } from "@/hooks/useFormat";
import type { PoolState } from "@/hooks/useHearth";

/**
 * The public half of Hearth: how many are saving, what the prize money adds up to, where the
 * clock is, and what one prize in each tier would pay if a draw closed now.
 *
 * Every figure here is a plain read, so a wallet is never needed to see it. The ones that have not
 * answered say so, because "the pool holds nothing" and "we have not heard back" look identical
 * once a zero is printed.
 */
export function PoolNow({
  pool,
  symbol,
  decimals,
}: {
  pool: PoolState;
  /** The confidential token every figure in this card is counted in. */
  symbol: string;
  decimals: number;
}) {
  const t = useTranslations("dashboard.pool");
  const tiers = useTranslations("dashboard.tiers");
  const format = useFormat();
  const ends = pool.periodEndsAt;

  return (
    <Card
      label={t("label")}
      pill={<CardPill tone="quiet">{t("pill")}</CardPill>}
      footer={
        <div className={`space-y-2 ${CARD_NOTE}`}>
          <p>{t("footOne")}</p>
          {pool.known.scaleBits ? (
            <p>
              {t.rich("footBracket", {
                bits: pool.scaleBits,
                bracket: (chunks) => <span className="tabular-nums text-muted">{chunks}</span>,
              })}
            </p>
          ) : (
            <p>{t("footBracketUnknown")}</p>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4">
        <Stat
          label={t("savers")}
          value={
            pool.known.savers ? format.count(pool.savers) : <Unknown reason={t("saversUnknown")} />
          }
        />
        <Stat
          label={t("liquidity")}
          value={
            pool.totalLiquidity === null ? (
              <Unknown reason={t("liquidityUnknown")} />
            ) : (
              format.amount(pool.totalLiquidity, decimals)
            )
          }
          unit={symbol}
        />
        <Stat
          label={t("period")}
          value={
            pool.known.period ? format.count(pool.period) : <Unknown reason={t("periodUnknown")} />
          }
        />
        <Stat
          label={t("endsIn")}
          value={ends > 0 ? <Countdown target={ends} /> : <Unknown reason={t("endsUnknown")} />}
          note={ends > 0 ? format.utc(ends) : undefined}
        />
      </div>

      {/* This rule opens a second block of content rather than attaching a note, so it carries the
          card's own edge weight. At the softer hairline it read at exactly the strength of the
          three row dividers below it and the table lost its top edge on the near-black card. */}
      <div className="mt-8 border-t border-hairline pt-5">
        <div className={`grid grid-cols-[1fr_auto] items-baseline gap-x-6 pb-1 sm:grid-cols-[1fr_auto_auto] ${CAP_LABEL}`}>
          <span>{t("tier")}</span>
          <span className="hidden text-end sm:block">{t("chance")}</span>
          <span className="text-end">{t("prizeEach", { symbol })}</span>
        </div>

        {pool.tiers.map((tier, index) => {
          const chance = tier.known ? (
            format.odds(tier.oddsNumerator, tier.oddsDenominator)
          ) : (
            <Unknown scale="inline" reason={t("oddsUnknown")} />
          );

          return (
            <div
              key={TIER_KEYS[index]}
              className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 border-b border-hairlineSoft py-3 last:border-b-0 sm:grid-cols-[1fr_auto_auto]"
            >
              <span className="min-w-0 text-[13.5px] text-parchment">
                {tiers(TIER_KEYS[index])}
                <span className="ms-2 text-[12.5px] text-muted">
                  {tier.known
                    ? t("prizeCount", { count: tier.prizeCount, shown: format.count(tier.prizeCount) })
                    : t("prizeCountUnknown")}
                </span>
                {/* The ember and not the flame. Everywhere else in the console the flame marks a
                    control, a link or the row you are standing on, and a carry is none of those. At
                    full flame it was the loudest thing in the table and pulled the eye off the prize
                    figure the row exists to show. */}
                {tier.carryPending && (
                  <span className="ms-2 text-[12.5px] text-ember">
                    {t("carryWaiting", { drawId: tier.carryPublishedAt })}
                  </span>
                )}
                {/* A phone has no room for a third column, and dropping the odds there took the
                    one number a saver is actually weighing off the screen entirely. It moves
                    under the tier name instead, carrying its own label. */}
                <span className="mt-1.5 flex items-baseline gap-2 sm:hidden">
                  <span className="text-[10.5px] uppercase tracking-label text-muted">{t("chance")}</span>
                  <span className="text-[12.5px] tabular-nums text-muted">{chance}</span>
                </span>
              </span>
              {/* Odds are a figure, and the faintest tone is where this console puts labels. On the
                  dark card that read as a column switched off rather than a column of data. */}
              <span className="hidden text-end text-[13px] tabular-nums text-muted sm:block">
                {chance}
              </span>
              <span className="text-end text-[14px] tabular-nums text-parchment">
                {tier.nextPrize === null ? (
                  <Unknown scale="inline" reason={t("nextPrizeUnknown")} />
                ) : (
                  format.amount(tier.nextPrize, decimals)
                )}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
