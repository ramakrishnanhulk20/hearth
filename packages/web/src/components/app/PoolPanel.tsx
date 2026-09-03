"use client";

import { Panel, Figure, Row } from "@/components/ui";
import { TIER_NAMES } from "@/lib/chain/addresses";
import { countdown, formatAmount, formatUtc, oddsLabel } from "@/lib/format";
import type { PoolState } from "@/hooks/useHearth";

/** The public half of Hearth: prize sizes, tier odds, the schedule and where the money comes from. */
export function PoolPanel({ pool, now, periodLength }: { pool: PoolState; now: number; periodLength: number }) {
  const perPeriod = pool.ratePerSecond * BigInt(periodLength);
  const runway = perPeriod > 0n ? pool.sponsorBalance / perPeriod : null;

  return (
    <Panel title="The pool" hint="public to everyone">
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Figure
          label="Grand prize next draw"
          accent
          value={formatAmount(pool.tiers[0]?.nextPrize ?? 0n)}
          unit="USDC"
        />
        <Figure label="Savers" value={pool.savers.toLocaleString("en-US")} />
        <Figure label="Period" value={pool.period.toLocaleString("en-US")} />
        <Figure
          label="Ends in"
          value={pool.periodEndsAt > 0 ? countdown(pool.periodEndsAt, now) : "..."}
          note={pool.periodEndsAt > 0 ? formatUtc(pool.periodEndsAt) : undefined}
        />
      </div>

      <div className="mt-5 border-t border-hairlineSoft pt-4">
        <div className="grid grid-cols-[1fr_auto] gap-x-6 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="col-span-full mb-1 grid grid-cols-[1fr_auto] gap-x-6 text-[11px] uppercase tracking-label text-faint sm:grid-cols-[1fr_auto_auto_auto]">
            <span>Tier</span>
            <span className="text-right">Prize each</span>
            <span className="hidden text-right sm:block">Chance</span>
            <span className="hidden text-right sm:block">Liquidity</span>
          </div>
          {pool.tiers.map((tier, index) => (
            <div
              key={index}
              className="col-span-full grid grid-cols-[1fr_auto] items-baseline gap-x-6 border-b border-hairlineSoft py-2.5 last:border-b-0 sm:grid-cols-[1fr_auto_auto_auto]"
            >
              <span className="text-[13.5px] text-parchment">
                {TIER_NAMES[index]}
                <span className="ml-2 text-[12px] text-faint">
                  {tier.prizeCount} prize{tier.prizeCount === 1 ? "" : "s"} a draw
                </span>
                {tier.carryPending && (
                  <span className="ml-2 text-[12px] text-flame/80">carry from draw {tier.carryPublishedAt} waiting</span>
                )}
              </span>
              <span className="text-right text-[13.5px] tabular-nums text-parchment">
                {formatAmount(tier.nextPrize)}
              </span>
              <span className="hidden text-right text-[13px] tabular-nums text-faint sm:block">
                {oddsLabel(tier.oddsNumerator, tier.oddsDenominator)}
              </span>
              <span className="hidden text-right text-[13px] tabular-nums text-faint sm:block">
                {formatAmount(tier.liquidity)}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-faint">
          Each prize is half of its tier&apos;s public liquidity divided by the prize count, fixed at the
          close before the random seed exists. What nobody wins is published one draw later and offered
          again, so the pot accumulates where you can watch it.
        </p>
      </div>

      <div className="mt-5 border-t border-hairlineSoft pt-4">
        <Row label="Draws run against a bracket of" value={`2^${pool.scaleBits}`} />
        <Row
          label="Prize money the sponsor still holds"
          value={`${formatAmount(pool.sponsorBalance)} USDC`}
          note={runway === null ? "the rate is zero" : `${runway.toString()} more draws`}
        />
        <Row label="Released per draw" value={`${formatAmount(perPeriod)} USDC`} />
        <Row label="Ready for the next harvest" value={`${formatAmount(pool.harvestable)} USDC`} />
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-faint">
        On Sepolia the yield is a sponsor-funded balance dripping at a fixed rate, because no venue here
        pays yield on Zama&apos;s mock USDC. The pool books only the amount a signed decryption says
        actually arrived, never a number the source reports about itself.
      </p>
    </Panel>
  );
}
