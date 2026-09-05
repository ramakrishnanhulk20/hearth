"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { Address } from "viem";
import { isAddress } from "viem";
import { useReadContracts } from "wagmi";
import { Providers } from "@/components/app/Providers";
import { PoolPicker } from "@/components/app/PoolPicker";
import { PoolProvider, useCurrentPool } from "@/components/app/PoolProvider";
// Straight from the file rather than the console barrel, which would pull the whole rail and its
// wallet chip into a page that has neither.
import { Unknown } from "@/components/app/console/Unknown";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Banner, Button, Panel, Pill, Row } from "@/components/ui";
import { HEARTH_POOL_ABI, HEARTH_VAULT_ABI } from "@/lib/chain/abis";
import { TIER_KEYS, txUrl } from "@/lib/chain/addresses";
import type { Pool } from "@/lib/chain/pools";
import { shortAddress } from "@/lib/format";
import { useFormat } from "@/hooks/useFormat";
import { usePoolReason } from "@/hooks/usePoolReason";
import { useActivity, useDraws, usePoolState, type DrawView } from "@/hooks/useHearth";

export function VerifyScreen({ pool }: { pool: Pool }) {
  return (
    <Providers>
      <PoolProvider pool={pool}>
        <Verify />
      </PoolProvider>
    </Providers>
  );
}

function Verify() {
  const t = useTranslations("verify");
  const token = useCurrentPool();
  const say = usePoolReason();
  const decimals = token.status === "open" ? token.decimals : 6;
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
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <h1
            className="font-display text-[clamp(2rem,5vw,3.2rem)] leading-[0.98] tracking-tightest text-parchment"
            style={{ fontWeight: 720 }}
          >
            {t("title")}
          </h1>
          {/* The picker sits in the headline row rather than under it: which token you are
              checking is the first thing this page has to answer. */}
          <div className="w-full max-w-[17rem]">
            <PoolPicker compact />
          </div>
        </div>
        <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-muted">
          {t.rich("lede", { code: (chunks) => <code className="text-flame/80">{chunks}</code> })}
        </p>

        {token.status !== "open" ? (
          <div className="mt-6">
            <Banner tone="bad" title={t("noPool", { symbol: token.symbol })}>
              {t("noPoolBody", { reason: say(token.reason) })}
            </Banner>
          </div>
        ) : unreachable ? (
          <div className="mt-6">
            <Banner
              tone="bad"
              title={t("unreachable")}
              action={
                <Button
                  tone="primary"
                  size="small"
                  onClick={() => {
                    pool.refetch();
                    refetchDraws();
                  }}
                >
                  {t("tryAgain")}
                </Button>
              }
            >
              {t("unreachableBody")}
            </Banner>
          </div>
        ) : reading ? (
          <ReadingDraws />
        ) : awarded.length === 0 ? (
          <p className="mt-8 text-[14px] text-muted">
            {draws.length === 0
              ? t("noneYet")
              : draws.length === 1
                ? t("oneNotClosed", { drawId: draws[0].drawId })
                : t("rangeNotClosed", {
                    first: draws[draws.length - 1].drawId,
                    last: draws[0].drawId,
                  })}
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
                  {t("drawButton", { drawId: item.drawId })}
                </button>
              ))}
            </div>

            {draw && (
              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
                <div className="flex flex-col gap-4">
                  <DrawFacts draw={draw} decimals={decimals} symbol={token.symbol} />
                  <TierFacts
                    draw={draw}
                    decimals={decimals}
                    symbol={token.symbol}
                    activityEvents={activity?.events ?? []}
                  />
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
  const reading = useTranslations("verify")("reading");

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
      <p className="mt-4 text-[13px] text-faint">{reading}</p>
    </div>
  );
}

function DrawFacts({ draw, decimals, symbol }: { draw: DrawView; decimals: number; symbol: string }) {
  const t = useTranslations("verify.facts");
  const format = useFormat();
  const bracket =
    draw.scaleBits > 0
      ? t("bracketNote", { count: format.count(1n << BigInt(draw.scaleBits)) })
      : undefined;

  return (
    <Panel
      title={t("title", { drawId: draw.drawId })}
      hint={<Pill tone={draw.status === "awarded" ? "good" : "quiet"}>{draw.status}</Pill>}
    >
      <Row
        label={t("periodCovered")}
        value={format.count(draw.drawId)}
        note={t("periodEnded", { stamp: format.utc(draw.periodEndsAt) })}
      />
      <Row label={t("windowEnds")} value={format.utc(draw.windowEndsAt)} />
      <Row
        label={t("seed")}
        value={
          draw.status === "awarded" ? (
            <span className="break-all">{draw.seed.toString()}</span>
          ) : (
            t("seedUnpublished")
          )
        }
      />
      <Row
        label={t("bracket")}
        value={draw.status === "awarded" ? `2^${draw.scaleBits}` : t("bracketUnset")}
        note={draw.status === "awarded" ? bracket : undefined}
      />
      <Row
        label={t("prizeSizes")}
        value={draw.prize.map((prize) => format.amount(prize, decimals)).join(" / ")}
        note={t("prizeSizesNote")}
      />
      <Row label={t("harvest")} value={`${format.amount(draw.harvested, decimals)} ${symbol}`} />
      <Row
        label={t("walkSavers")}
        value={draw.walkCount === 0 ? t("walkNotStarted") : format.count(draw.walkCount)}
      />
      <Row
        label={t("walkPosition")}
        value={
          draw.walkCount === 0
            ? format.count(0)
            : t("walkProgress", {
                cursor: format.count(draw.cursor),
                total: format.count(draw.walkCount),
              })
        }
      />
      <Row label={t("finalized")} value={draw.finalized ? t("yes") : t("no")} />

      <p className="mt-4 text-[12.5px] leading-relaxed text-faint">{t("note")}</p>
    </Panel>
  );
}

function TierFacts({
  draw,
  decimals,
  symbol,
  activityEvents,
}: {
  draw: DrawView;
  decimals: number;
  symbol: string;
  activityEvents: { kind: string; drawId: number; tier: number | null; amount: string | null }[];
}) {
  const t = useTranslations("verify.tiers");
  const tiers = useTranslations("dashboard.tiers");
  const format = useFormat();

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
    <Panel title={t("title")} hint={t("hint")}>
      <div className="flex flex-col gap-3">
        {TIER_KEYS.map((key, tier) => {
          const offered = draw.offered[tier];
          const prize = draw.prize[tier];
          const carry = carries[tier];
          const paid = carry !== undefined && prize > 0n && offered >= carry ? (offered - carry) / prize : null;
          const exact = paid !== null && carry !== undefined && offered - carry === paid * prize;

          return (
            <div key={tier} className="rounded-card border border-hairlineSoft bg-[rgba(10,10,10,0.5)] p-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13.5px] text-parchment">{tiers(key)}</span>
                <span className="text-[13px] tabular-nums text-faint">
                  {t("each", { amount: format.amount(prize, decimals), symbol })}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px] tabular-nums text-faint">
                <span>{t("offered")}</span>
                <span className="text-end text-parchment">{format.amount(offered, decimals)}</span>
                <span>{t("returned")}</span>
                <span className="text-end text-parchment">
                  {carry === undefined ? t("notReconciled") : format.amount(carry, decimals)}
                </span>
                <span>{t("paid")}</span>
                <span className="text-end text-parchment">
                  {carry === undefined
                    ? t("paidUnknown")
                    : exact && paid !== null
                      ? format.count(paid)
                      : t("paidInexact")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[12.5px] leading-relaxed text-faint">{t("note")}</p>
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
  const t = useTranslations("verify.thresholds");
  const tiers = useTranslations("dashboard.tiers");
  const format = useFormat();
  const token = useCurrentPool();
  const vault = token.status === "open" ? token.vault : null;
  const pool = token.status === "open" ? token.pool : null;
  const enabled = vault !== null && pool !== null && address !== null && draw.status === "awarded";

  const { data: params } = useReadContracts({
    query: { enabled: pool !== null && draw.status === "awarded" },
    contracts: pool ? [{ address: pool, abi: HEARTH_POOL_ABI, functionName: "drawParams", args: [draw.drawId] }] : [],
  });

  /**
   * How many prizes each tier had in this draw, or nothing.
   *
   * There used to be a [1, 1, 4] fallback here, which invented a row per prize on a page whose
   * whole job is to be checkable against the chain. A read that has not answered gets no rows.
   */
  const counts = useMemo((): { kind: "reading" | "failed" } | { kind: "ok"; list: number[] } => {
    const entry = params?.[0];
    if (!entry) return { kind: "reading" };
    if (entry.status !== "success") return { kind: "failed" };
    return { kind: "ok", list: entry.result.prizeCount.map((value) => Number(value)) };
  }, [params]);

  const requests = useMemo(() => {
    if (!enabled || !vault || !address || counts.kind !== "ok") return [];
    const list: { tier: number; index: number }[] = [];
    counts.list.forEach((count, tier) => {
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
    <Panel title={t("title")} hint={t("hint")}>
      <p className="text-[12.5px] leading-relaxed text-muted">{t("body")}</p>

      <input
        value={typed}
        onChange={(event) => onType(event.target.value)}
        placeholder="0x..."
        aria-label={t("fieldName")}
        spellCheck={false}
        className="mt-3 w-full rounded-lg border border-hairline bg-[rgba(10,10,10,0.6)] px-3.5 py-3 font-sans text-[13px] tabular-nums text-parchment outline-none placeholder:text-parchment/25 focus:border-flame/45"
      />

      {typed.trim() !== "" && address === null && (
        <p className="mt-2 text-[12.5px] text-bad">{t("invalid")}</p>
      )}

      {draw.status !== "awarded" && (
        <p className="mt-3 text-[12.5px] text-faint">{t("notAwarded", { drawId: draw.drawId })}</p>
      )}

      {address && draw.status === "awarded" && (
        <div className="mt-4">
          <p className="text-[12px] uppercase tracking-label text-faint">{shortAddress(address)}</p>

          {counts.kind === "failed" && <p className="mt-2 text-[12.5px] text-muted">{t("noCounts")}</p>}
          {counts.kind === "reading" && <p className="mt-2 text-[12.5px] text-faint">{t("reading")}</p>}

          <div className="mt-2 flex flex-col">
            {requests.map((request, slot) => {
              const entry = thresholds?.[slot];
              const skipped = entry?.status === "success" ? entry.result[1] : false;
              return (
                <Row
                  key={`${request.tier}-${request.index}`}
                  label={t("row", {
                    tier: tiers(TIER_KEYS[request.tier]),
                    index: request.index + 1,
                  })}
                  value={
                    // Three different answers, and the old code printed "reading" for all of
                    // them. A call that came back failed is not still in flight, and a page that
                    // says it is will say it forever.
                    entry === undefined ? (
                      t("reading")
                    ) : entry.status !== "success" ? (
                      <Unknown scale="inline" reason={t("rowFailed")} />
                    ) : skipped ? (
                      t("outOfRange")
                    ) : (
                      format.count(entry.result[0])
                    )
                  }
                  note={entry?.status === "success" && !skipped ? t("unit") : undefined}
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
  const t = useTranslations("verify.transactions");
  const tiersLower = useTranslations("dashboard.tiersLower");
  const { slug } = useCurrentPool();
  const mine = activityEvents.filter((event) => event.drawId === draw.drawId);

  /** The contract's event name, as a key into this panel's own namespace. */
  const LABELS: Record<string, string> = {
    DrawClosed: "closed",
    DrawAwarded: "awarded",
    DrawEmpty: "markedEmpty",
    DrawSkipped: "markedSkipped",
    DrawFinalized: "finalized",
    TierReconciled: "reconciled",
  };

  /** One row's name: the step, plus the tier when the event carries one. */
  const label = (kind: string, tier: number | null): string => {
    const name = LABELS[kind] ? t(LABELS[kind]) : kind;
    return tier === null ? name : t("withTier", { label: name, tier: tiersLower(TIER_KEYS[tier]) });
  };

  return (
    <Panel title={t("title")} hint={t("hint")}>
      {error && <p className="text-[12.5px] text-faint">{error}</p>}
      {!error && mine.length === 0 && <p className="text-[12.5px] text-faint">{t("none")}</p>}
      <div className="flex flex-col">
        {mine.map((event) => (
          <Row
            key={`${event.kind}-${event.tier ?? ""}-${event.tx}`}
            label={label(event.kind, event.tier)}
            value={
              <a
                href={txUrl(event.tx)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-flame/80 underline-offset-2 hover:underline"
              >
                {t("block", { block: event.block })}
              </a>
            }
          />
        ))}
      </div>
      <div className="mt-4">
        <Button href={`/app/${slug}`} size="small">
          {t("open")}
        </Button>
      </div>
    </Panel>
  );
}
