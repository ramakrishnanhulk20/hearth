"use client";

import { useMemo, useState } from "react";
import type { Address } from "viem";
import { isAddress } from "viem";
import { useReadContracts } from "wagmi";
import { Providers } from "@/components/app/Providers";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Banner, Button, Panel, Pill, Row } from "@/components/ui";
import { HEARTH_POOL_ABI, HEARTH_VAULT_ABI } from "@/lib/chain/abis";
import { CONFIGURED, HEARTH, TIER_NAMES, txUrl } from "@/lib/chain/addresses";
import { formatAmount, formatUtc, shortAddress } from "@/lib/format";
import { useActivity, useDraws, usePoolState, type DrawView } from "@/hooks/useHearth";

export function VerifyScreen() {
  return (
    <Providers>
      <Verify />
    </Providers>
  );
}

function Verify() {
  const pool = usePoolState();
  const {
    draws,
    isLoading: drawsLoading,
    unavailable: drawsUnavailable,
    isError: drawsError,
    refetch: refetchDraws,
  } = useDraws(pool.period);
  const { activity, error: activityError } = useActivity();
  const [selected, setSelected] = useState<number | null>(null);
  const [typed, setTyped] = useState("");

  const awarded = draws.filter((draw) => draw.status !== "none");
  const draw = awarded.find((item) => item.drawId === selected) ?? awarded[0] ?? null;

  const address = isAddress(typed.trim()) ? (typed.trim() as Address) : null;

  // A missed read leaves period at 0, which empties the draw list. Saying "no draw has been closed"
  // off that would be a claim about the chain the page has not read, so the reads gate the sentence.
  // A dead endpoint does not surface as isError: wagmi returns a batch of per-call failures, so the
  // batch looks answered. Only the per-call known flags tell a real zero from a read that never ran.
  const poolAnswered = !pool.isLoading && !pool.unavailable;
  const poolFailed = pool.isError || (poolAnswered && !pool.known.period);
  const drawsExpected = poolAnswered && !poolFailed && pool.period > 1;
  const drawsAnswered = drawsExpected && !drawsLoading && !drawsUnavailable;
  const drawsFailed =
    drawsExpected && (drawsError || (drawsAnswered && !draws.every((item) => item.known)));
  const unreachable = poolFailed || drawsFailed;
  const reading = !unreachable && (!poolAnswered || (drawsExpected && !drawsAnswered));

  return (
    <div className="grain relative min-h-[100svh] bg-ink">
      <SmoothScroll />
      <SiteHeader />

      <main className="mx-auto w-full max-w-[76rem] px-4 pb-16 pt-8 sm:px-6">
        <h1
          className="font-display text-[clamp(2rem,5vw,3.2rem)] leading-[0.98] tracking-tightest text-parchment"
          style={{ fontWeight: 720 }}
        >
          Check a draw yourself.
        </h1>
        <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-muted">
          No wallet needed. Every number here is read straight from the contracts, and the thresholds
          come from the vault&apos;s own <code className="text-flame/80">thresholdOf</code> view, which is
          the same arithmetic that decided the outcome. There is no second implementation on this page
          to disagree with the first.
        </p>

        {!CONFIGURED ? (
          <div className="mt-6">
            <Banner tone="bad" title="Hearth is not configured.">
              The vault and pool addresses have to be set for this page to read anything.
            </Banner>
          </div>
        ) : unreachable ? (
          <div className="mt-6">
            <Banner
              tone="bad"
              title="Could not reach Sepolia."
              action={
                <Button
                  tone="primary"
                  size="small"
                  onClick={() => {
                    pool.refetch();
                    refetchDraws();
                  }}
                >
                  Try again
                </Button>
              }
            >
              This page reads the vault and the pool over an RPC endpoint, and that read failed, so it
              has nothing to show. The draws themselves are on chain either way.
            </Banner>
          </div>
        ) : reading ? (
          <ReadingDraws />
        ) : awarded.length === 0 ? (
          <p className="mt-8 text-[14px] text-muted">
            {draws.length === 0 ? (
              <>
                No draw has been closed yet, so there is nothing to check. The first one appears once
                period 1 is over and somebody closes it.
              </>
            ) : draws.length === 1 ? (
              <>Draw {draws[0].drawId} has not been closed yet, so there is nothing to check.</>
            ) : (
              <>
                Draws {draws[draws.length - 1].drawId} to {draws[0].drawId} have not been closed, so
                there is nothing to check here. Anything older is on the explorer.
              </>
            )}
          </p>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap gap-2">
              {awarded.map((item) => (
                <button
                  key={item.drawId}
                  type="button"
                  onClick={() => setSelected(item.drawId)}
                  className={`rounded-lg border px-3.5 py-2 text-[13px] tabular-nums transition-colors ${
                    draw?.drawId === item.drawId
                      ? "border-flame/50 bg-flame/[0.08] text-flame"
                      : "border-hairline text-muted hover:border-hairlineStrong hover:text-parchment"
                  }`}
                >
                  Draw {item.drawId}
                </button>
              ))}
            </div>

            {draw && (
              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
                <div className="flex flex-col gap-4">
                  <DrawFacts draw={draw} />
                  <TierFacts draw={draw} activityEvents={activity?.events ?? []} />
                </div>
                <div className="flex flex-col gap-4">
                  <Thresholds draw={draw} address={address} typed={typed} onType={setTyped} />
                  <Transactions draw={draw} activityEvents={activity?.events ?? []} error={activityError} />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

/** Held in place of the draw list until the reads land, so an empty page never reads as an empty chain. */
function ReadingDraws() {
  return (
    <div aria-busy="true">
      <div className="mt-6 flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((slot) => (
          <div
            key={slot}
            className="h-[38px] w-[86px] animate-pulse rounded-lg border border-hairline bg-[rgba(255,255,255,0.03)]"
          />
        ))}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        {[0, 1].map((column) => (
          <div key={column} className="flex flex-col gap-4">
            <div className="h-[300px] animate-pulse rounded-panel border border-hairline bg-[rgba(255,255,255,0.02)]" />
            <div className="h-[190px] animate-pulse rounded-panel border border-hairline bg-[rgba(255,255,255,0.02)]" />
          </div>
        ))}
      </div>
      <p className="mt-4 text-[13px] text-faint">Reading the draws from Sepolia.</p>
    </div>
  );
}

function DrawFacts({ draw }: { draw: DrawView }) {
  const bracket =
    draw.scaleBits > 0 ? `${(1n << BigInt(draw.scaleBits)).toLocaleString("en-US")} balance-seconds` : undefined;

  return (
    <Panel title={`Draw ${draw.drawId}`} hint={<Pill tone={draw.status === "awarded" ? "good" : "quiet"}>{draw.status}</Pill>}>
      <Row label="Period covered" value={draw.drawId} note={`ended ${formatUtc(draw.periodEndsAt)}`} />
      <Row label="Window ends" value={formatUtc(draw.windowEndsAt)} />
      <Row
        label="Seed"
        value={draw.status === "awarded" ? <span className="break-all">{draw.seed.toString()}</span> : "not published yet"}
      />
      <Row
        label="Bracket"
        value={draw.status === "awarded" ? `2^${draw.scaleBits}` : "not set yet"}
        note={draw.status === "awarded" ? bracket : undefined}
      />
      <Row label="Prize sizes" value={draw.prize.map((prize) => formatAmount(prize)).join(" / ")} note="grand / mid / frequent" />
      <Row label="Harvest booked" value={`${formatAmount(draw.harvested)} USDC`} />
      <Row label="Savers in the walk" value={draw.walkCount === 0 ? "not started" : draw.walkCount} />
      <Row label="Walk position" value={draw.walkCount === 0 ? "0" : `${draw.cursor} of ${draw.walkCount}`} />
      <Row label="Finalized" value={draw.finalized ? "yes" : "no"} />

      <p className="mt-4 text-[12.5px] leading-relaxed text-faint">
        The seed is generated as a ciphertext inside Zama&apos;s coprocessor, so nobody sees it when it is
        drawn, and closing a draw succeeds exactly once, so there is no second roll. The bracket is the
        smallest power of two above the pool&apos;s aggregate weight, published instead of the exact
        aggregate because two consecutive exact totals would solve for a lone mover&apos;s deposit.
      </p>
    </Panel>
  );
}

function TierFacts({ draw, activityEvents }: { draw: DrawView; activityEvents: { kind: string; drawId: number; tier: number | null; amount: string | null }[] }) {
  const carries = useMemo(() => {
    const found: Record<number, bigint> = {};
    for (const event of activityEvents) {
      if (event.kind === "TierReconciled" && event.drawId === draw.drawId && event.tier !== null && event.amount !== null) {
        found[event.tier] = BigInt(event.amount);
      }
    }
    return found;
  }, [activityEvents, draw.drawId]);

  return (
    <Panel title="What each tier offered and paid" hint="public by design">
      <div className="flex flex-col gap-3">
        {TIER_NAMES.map((name, tier) => {
          const offered = draw.offered[tier];
          const prize = draw.prize[tier];
          const carry = carries[tier];
          const paid = carry !== undefined && prize > 0n && offered >= carry ? (offered - carry) / prize : null;
          const exact = paid !== null && carry !== undefined && offered - carry === paid * prize;

          return (
            <div key={tier} className="rounded-card border border-hairlineSoft bg-[rgba(10,10,10,0.5)] p-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13.5px] text-parchment">{name}</span>
                <span className="text-[13px] tabular-nums text-faint">{formatAmount(prize)} USDC each</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px] tabular-nums text-faint">
                <span>offered</span>
                <span className="text-right text-parchment">{formatAmount(offered)}</span>
                <span>returned unpaid</span>
                <span className="text-right text-parchment">
                  {carry === undefined ? "not reconciled yet" : formatAmount(carry)}
                </span>
                <span>prizes paid</span>
                <span className="text-right text-parchment">
                  {carry === undefined ? "unknown until reconciled" : exact ? paid?.toString() : "not exactly derivable"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[12.5px] leading-relaxed text-faint">
        Prizes paid is worked out from the public numbers: what the tier offered, minus what came back
        unpaid, divided by the prize size. It comes out exact whenever no encrypted carry rode along
        into the draw, and this deployment reconciles every tier every draw so that it usually does. It
        never says who was paid.
      </p>
    </Panel>
  );
}

function Thresholds({
  draw,
  address,
  typed,
  onType,
}: {
  draw: DrawView;
  address: Address | null;
  typed: string;
  onType: (next: string) => void;
}) {
  const vault = HEARTH.vault;
  const pool = HEARTH.pool;
  const enabled = vault !== null && pool !== null && address !== null && draw.status === "awarded";

  const { data: params } = useReadContracts({
    query: { enabled: pool !== null && draw.status === "awarded" },
    contracts: pool ? [{ address: pool, abi: HEARTH_POOL_ABI, functionName: "drawParams", args: [draw.drawId] }] : [],
  });

  const counts = useMemo(() => {
    const entry = params?.[0];
    if (!entry || entry.status !== "success") return [1, 1, 4];
    return entry.result.prizeCount.map((value) => Number(value));
  }, [params]);

  const requests = useMemo(() => {
    if (!enabled || !vault || !address) return [];
    const list: { tier: number; index: number }[] = [];
    counts.forEach((count, tier) => {
      for (let index = 0; index < count; index++) list.push({ tier, index });
    });
    return list;
  }, [enabled, vault, address, counts]);

  const { data: thresholds } = useReadContracts({
    query: { enabled: enabled && requests.length > 0 },
    contracts:
      enabled && vault && address
        ? requests.map(
            (request) =>
              ({
                address: vault,
                abi: HEARTH_VAULT_ABI,
                functionName: "thresholdOf",
                args: [draw.drawId, address, request.tier, request.index],
              }) as const,
          )
        : [],
  });

  return (
    <Panel title="Thresholds for an address" hint="read from thresholdOf">
      <p className="text-[12.5px] leading-relaxed text-muted">
        Paste any address. The vault returns the exact weight that address had to beat in every prize of
        every tier for this draw. Compare it against that saver&apos;s own decrypted weight and the
        outcome checks out: they won a prize exactly when their weight was strictly above its threshold.
      </p>

      <input
        value={typed}
        onChange={(event) => onType(event.target.value)}
        placeholder="0x..."
        spellCheck={false}
        className="mt-3 w-full rounded-lg border border-hairline bg-[rgba(10,10,10,0.6)] px-3.5 py-3 font-sans text-[13px] tabular-nums text-parchment outline-none placeholder:text-parchment/25 focus:border-flame/45"
      />

      {typed.trim() !== "" && address === null && (
        <p className="mt-2 text-[12.5px] text-bad">That is not a valid Ethereum address.</p>
      )}

      {draw.status !== "awarded" && (
        <p className="mt-3 text-[12.5px] text-faint">
          Draw {draw.drawId} is not awarded, so it has no seed and no thresholds yet.
        </p>
      )}

      {address && draw.status === "awarded" && (
        <div className="mt-4">
          <p className="text-[12px] uppercase tracking-label text-faint">{shortAddress(address)}</p>
          <div className="mt-2 flex flex-col">
            {requests.map((request, slot) => {
              const entry = thresholds?.[slot];
              const ok = entry && entry.status === "success";
              const threshold = ok ? entry.result[0] : null;
              const skipped = ok ? entry.result[1] : false;
              return (
                <Row
                  key={`${request.tier}-${request.index}`}
                  label={`${TIER_NAMES[request.tier]} prize ${request.index + 1}`}
                  value={
                    !ok
                      ? "reading"
                      : skipped
                        ? "out of range, so unwinnable"
                        : threshold!.toLocaleString("en-US")
                  }
                  note={ok && !skipped ? "balance-seconds" : undefined}
                />
              );
            })}
          </div>
        </div>
      )}
    </Panel>
  );
}

function Transactions({
  draw,
  activityEvents,
  error,
}: {
  draw: DrawView;
  activityEvents: { kind: string; drawId: number; tier: number | null; tx: string; block: number }[];
  error: string | null;
}) {
  const mine = activityEvents.filter((event) => event.drawId === draw.drawId);

  const LABELS: Record<string, string> = {
    DrawClosed: "Closed",
    DrawAwarded: "Awarded",
    DrawEmpty: "Marked empty",
    DrawSkipped: "Marked skipped",
    DrawFinalized: "Finalized",
    TierReconciled: "Tier reconciled",
  };

  return (
    <Panel title="The transactions" hint="on Etherscan">
      {error && <p className="text-[12.5px] text-faint">{error}</p>}
      {!error && mine.length === 0 && (
        <p className="text-[12.5px] text-faint">
          Nothing for this draw in the last few hours of blocks. Older history is on the explorer.
        </p>
      )}
      <div className="flex flex-col">
        {mine.map((event) => (
          <Row
            key={`${event.kind}-${event.tier ?? ""}-${event.tx}`}
            label={`${LABELS[event.kind] ?? event.kind}${event.tier !== null ? ` (${TIER_NAMES[event.tier].toLowerCase()})` : ""}`}
            value={
              <a
                href={txUrl(event.tx)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-flame/80 underline-offset-2 hover:underline"
              >
                block {event.block}
              </a>
            }
          />
        ))}
      </div>
      <div className="mt-4">
        <Button href="/app" size="small">
          Open the pool
        </Button>
      </div>
    </Panel>
  );
}
