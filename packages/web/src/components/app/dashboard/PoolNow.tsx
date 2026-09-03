"use client";

import { CAP_LABEL, CARD_NOTE, Card, CardPill, Stat, Unknown } from "@/components/app/console";
import { TIER_NAMES } from "@/lib/chain/addresses";
import { countdown, formatAmount, formatUtc, oddsLabel } from "@/lib/format";
import type { PoolState } from "@/hooks/useHearth";

/**
 * The public half of Hearth: how many are saving, what the prize money adds up to, where the
 * clock is, and what one prize in each tier would pay if a draw closed now.
 *
 * Every figure here is a plain read, so a wallet is never needed to see it. The ones that have not
 * answered say so, because "the pool holds nothing" and "we have not heard back" look identical
 * once a zero is printed.
 */
export function PoolNow({ pool, now }: { pool: PoolState; now: number }) {
  const ends = pool.periodEndsAt;

  return (
    <Card
      label="The pool right now"
      pill={<CardPill tone="quiet">public to everyone</CardPill>}
      footer={
        <div className={`space-y-2 ${CARD_NOTE}`}>
          <p>
            Each prize is half of its tier&apos;s liquidity divided by the prize count, fixed at the close
            before the random seed exists. What nobody wins is published one draw later and offered again.
          </p>
          {pool.known.scaleBits ? (
            <p>
              Odds are drawn against a bracket of{" "}
              <span className="tabular-nums text-muted">2^{pool.scaleBits}</span>, published with the draw.
            </p>
          ) : (
            <p>The bracket those odds are drawn against has not come back from the chain yet.</p>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4">
        <Stat
          label="Savers"
          value={
            pool.known.savers ? (
              pool.savers.toLocaleString("en-US")
            ) : (
              <Unknown reason="The saver count has not come back from the chain yet." />
            )
          }
        />
        <Stat
          label="Prize liquidity"
          value={
            pool.totalLiquidity === null ? (
              <Unknown reason="One of the three tier balances has not come back yet, and a partial sum is not the pool." />
            ) : (
              formatAmount(pool.totalLiquidity)
            )
          }
          unit="USDC"
        />
        <Stat
          label="Period"
          value={
            pool.known.period ? (
              pool.period.toLocaleString("en-US")
            ) : (
              <Unknown reason="The current period has not come back from the chain yet." />
            )
          }
        />
        <Stat
          label="Ends in"
          value={
            ends > 0 ? (
              countdown(ends, now)
            ) : (
              <Unknown reason="The end of this period has not come back from the chain yet." />
            )
          }
          note={ends > 0 ? formatUtc(ends) : undefined}
        />
      </div>

      {/* This rule opens a second block of content rather than attaching a note, so it carries the
          card's own edge weight. At the softer hairline it read at exactly the strength of the
          three row dividers below it and the table lost its top edge on the near-black card. */}
      <div className="mt-8 border-t border-hairline pt-5">
        <div className={`grid grid-cols-[1fr_auto] items-baseline gap-x-6 pb-1 sm:grid-cols-[1fr_auto_auto] ${CAP_LABEL}`}>
          <span>Tier</span>
          <span className="hidden text-right sm:block">Chance</span>
          <span className="text-right">Prize each (USDC)</span>
        </div>

        {pool.tiers.map((tier, index) => (
          <div
            key={TIER_NAMES[index]}
            className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 border-b border-hairlineSoft py-3 last:border-b-0 sm:grid-cols-[1fr_auto_auto]"
          >
            <span className="min-w-0 text-[13.5px] text-parchment">
              {TIER_NAMES[index]}
              <span className="ml-2 text-[12.5px] text-muted">
                {tier.known
                  ? `${tier.prizeCount} prize${tier.prizeCount === 1 ? "" : "s"} a draw`
                  : "prize count unknown"}
              </span>
              {/* The ember and not the flame. Everywhere else in the console the flame marks a
                  control, a link or the row you are standing on, and a carry is none of those. At
                  full flame it was the loudest thing in the table and pulled the eye off the prize
                  figure the row exists to show. */}
              {tier.carryPending && (
                <span className="ml-2 text-[12.5px] text-ember">
                  carry from draw {tier.carryPublishedAt} waiting
                </span>
              )}
            </span>
            {/* Odds are a figure, and the faintest tone is where this console puts labels. On the
                dark card that read as a column switched off rather than a column of data. */}
            <span className="hidden text-right text-[13px] tabular-nums text-muted sm:block">
              {tier.known ? (
                oddsLabel(tier.oddsNumerator, tier.oddsDenominator)
              ) : (
                <Unknown scale="inline" reason="This tier's odds have not come back from the chain yet." />
              )}
            </span>
            <span className="text-right text-[14px] tabular-nums text-parchment">
              {tier.nextPrize === null ? (
                <Unknown scale="inline" reason="This tier's next prize has not come back from the chain yet." />
              ) : (
                formatAmount(tier.nextPrize)
              )}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
