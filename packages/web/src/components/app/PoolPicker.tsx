"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useReadContracts } from "wagmi";
import { usePathname, useRouter } from "@/i18n/navigation";
import { HEARTH_POOL_ABI } from "@/lib/chain/abis";
import { ZAMA_TOKEN_LIST } from "@/lib/chain/addresses";
import { OPEN_POOLS, POOLS, type Pool } from "@/lib/chain/pools";
import { useFormat } from "@/hooks/useFormat";
import { usePoolReason } from "@/hooks/usePoolReason";
import { ChevronIcon, CoinIcon } from "./console/icons";
import { rememberPool, useCurrentPool } from "./PoolProvider";

const UTILISATION_BPS = 5000n;

type Entry = { status: "success"; result: unknown } | { status: "failure"; error: unknown };

/**
 * The prize column of one row: what the grand tier pays, or when this pool's first draw can close.
 * Only one of the two is ever set, and a pool waiting for its first draw has no prize to state.
 */
type Prize = { grand: bigint | null; firstDrawAt: number | null };

const NOTHING_READ: Prize = { grand: null, firstDrawAt: null };

/**
 * What one grand prize is worth in every open pool, in a single multicall.
 *
 * Three reads per pool, all of them in one wagmi batch, so opening the picker costs one round trip
 * whether there is one token on the shelf or eight. The figures are real: a token whose read did
 * not land shows nothing rather than a zero, and a pool that has never closed a draw is empty on
 * purpose, so it hands back the time of its first draw instead of a jackpot of zero.
 */
function useGrandPrizes(): Record<string, Prize> {
  const { data } = useReadContracts({
    query: { enabled: OPEN_POOLS.length > 0, refetchInterval: 30_000 },
    contracts: OPEN_POOLS.flatMap((entry) => [
      { address: entry.pool, abi: HEARTH_POOL_ABI, functionName: "liquidity", args: [0n] } as const,
      { address: entry.pool, abi: HEARTH_POOL_ABI, functionName: "tierOf", args: [0] } as const,
      { address: entry.pool, abi: HEARTH_POOL_ABI, functionName: "lastClosedDraw" } as const,
    ]),
  });

  return useMemo(() => {
    const found: Record<string, Prize> = {};
    OPEN_POOLS.forEach((entry, index) => {
      const rows = data as readonly Entry[] | undefined;
      const liquidity = rows?.[index * 3];
      const tier = rows?.[index * 3 + 1];
      const closed = rows?.[index * 3 + 2];
      // Draw 1 covers the first period, so it can only close once that period is over.
      const firstDrawAt =
        closed?.status === "success" && Number(closed.result) === 0
          ? entry.firstPeriodAt + entry.periodLength
          : null;
      if (liquidity?.status !== "success" || tier?.status !== "success") {
        found[entry.slug] = { grand: null, firstDrawAt };
        return;
      }
      const count = Number((tier.result as { prizeCount: number }).prizeCount);
      found[entry.slug] = {
        grand:
          count === 0 ? 0n : ((liquidity.result as bigint) * UTILISATION_BPS) / 10_000n / BigInt(count),
        firstDrawAt,
      };
    });
    return found;
  }, [data]);
}

/**
 * The same screen, on another token.
 *
 * Picking a pool is a navigation and never a transaction: it swaps the slug in the path, keeps
 * the saver on the screen they were reading, and remembers the choice for the next visit. The
 * restricted token is listed and refused in the same row, because leaving it out would look like
 * an oversight and the reason it cannot be used is the interesting part.
 */
export function PoolPicker({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("picker");
  const current = useCurrentPool();
  const pathname = usePathname();
  const router = useRouter();
  const prizes = useGrandPrizes();

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Two of these can sit on one page, the rail and the top bar, so the ids the trigger points at
  // have to be generated rather than written down.
  const listId = useId();
  const rowId = (slug: string) => `${listId}-${slug}`;

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // The row you are standing on takes focus when the list opens, so the arrow keys start from
  // where the eye already is rather than from the top of a list of eight.
  useEffect(() => {
    if (!open) return;
    const selected = listRef.current?.querySelector<HTMLElement>('[data-selected="true"]');
    (selected ?? listRef.current?.querySelector<HTMLElement>("[data-row]"))?.focus();
  }, [open]);

  const go = (pool: Pool) => {
    setOpen(false);
    rememberPool(pool.slug);
    router.push(swapSlug(pathname, current.slug, pool.slug));
  };

  const onListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-row]") ?? []);
    if (rows.length === 0) return;
    const index = rows.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === "ArrowDown"
        ? rows[(index + 1) % rows.length]
        : event.key === "ArrowUp"
          ? rows[(index - 1 + rows.length) % rows.length]
          : event.key === "Home"
            ? rows[0]
            : event.key === "End"
              ? rows[rows.length - 1]
              : null;
    if (!next) return;
    event.preventDefault();
    next.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={t("trigger", { symbol: current.symbol })}
        // The row draws at forty-two pixels, which is what the ticker and its caption need and
        // two short of what a thumb needs. The pseudo-element carries no paint, so it lifts the
        // target to forty-four without moving anything on screen.
        className={`group relative flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-start transition-colors after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-[''] ${
          open
            ? "border-flame/45 bg-flame/[0.08]"
            : "border-hairline bg-raised hover:border-hairlineStrong hover:bg-hover"
        }`}
      >
        {/* The coin steps aside in the narrow top bar, where the ticker is what the row is for
            and the twenty-five pixels it costs are the difference between a name and an ellipsis. */}
        <span className={`shrink-0 text-flameInk ${compact ? "hidden sm:block" : ""}`}>
          <CoinIcon size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-parchment">{current.symbol}</span>
          {!compact && (
            <span className="block truncate text-[11.5px] text-faint">
              {current.status === "open" ? t("savingPool") : t("notSupported")}
            </span>
          )}
        </span>
        <span
          className={`shrink-0 text-faint transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <ChevronIcon size={15} />
        </span>
      </button>

      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={t("list")}
          onKeyDown={onListKeyDown}
          // Anchored to its start edge in both places, which mirrors with the language. Hung off
          // the far edge it would run off a 375 pixel screen, because the button it opens from is
          // narrower than the list.
          //
          // In the rail it takes the rail's own width. The rail scrolls, which clips anything
          // wider than it, so a nineteen-rem panel lost its prize column to the panel edge.
          className={`panel-glare absolute start-0 z-50 max-h-[70vh] overflow-y-auto rounded-card border border-hairlineStrong bg-surface p-1.5 shadow-popover ${
            compact
              ? "top-[calc(100%+6px)] w-[19rem] max-w-[calc(100vw-5rem)]"
              : "bottom-[calc(100%+6px)] w-full"
          }`}
        >
          {/* The column heading carries the caption, so no row has to spend its width saying
              "grand prize" nine times over. */}
          <div className="flex items-baseline justify-between gap-3 px-2.5 pb-1.5 pt-1 text-[10.5px] uppercase tracking-label text-faint">
            <span>{t("saveIn")}</span>
            <span>{t("grandPrize")}</span>
          </div>

          {POOLS.map((pool) => (
            <Row
              key={pool.slug}
              id={rowId(pool.slug)}
              pool={pool}
              selected={pool.slug === current.slug}
              prize={prizes[pool.slug] ?? NOTHING_READ}
              onPick={() => go(pool)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  id,
  pool,
  selected,
  prize,
  onPick,
}: {
  id: string;
  pool: Pool;
  selected: boolean;
  prize: Prize;
  onPick: () => void;
}) {
  const t = useTranslations("picker");
  const format = useFormat();
  const say = usePoolReason();
  const restricted = pool.status !== "open";
  const reason = pool.status === "restricted" ? say(pool.reason) : "";

  return (
    <div
      id={id}
      data-row
      data-selected={selected}
      role="option"
      aria-selected={selected}
      aria-disabled={restricted}
      title={restricted ? reason : pool.name}
      tabIndex={-1}
      onClick={restricted ? undefined : onPick}
      onKeyDown={(event) => {
        if (restricted) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPick();
        }
      }}
      className={`flex items-center gap-3 rounded-lg px-2.5 py-2.5 outline-none transition-colors ${
        restricted
          ? "cursor-not-allowed opacity-55"
          : selected
            ? "ember-lit cursor-pointer"
            : "cursor-pointer hover:bg-hover focus-visible:bg-hover"
      } focus-visible:ring-1 focus-visible:ring-flame/50`}
    >
      <span className={`shrink-0 ${selected ? "text-flameInk" : restricted ? "text-faint" : "text-muted"}`}>
        <CoinIcon size={18} />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[13px] ${selected ? "font-medium text-flameInk" : "text-parchment"}`}
        >
          {pool.symbol}
        </span>
        <span className="block truncate text-[11.5px] text-faint">
          {restricted ? reason : pool.name}
        </span>
      </span>

      <span className="shrink-0 text-end">
        {restricted ? (
          <a
            href={ZAMA_TOKEN_LIST}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="text-[11.5px] text-flameInk underline-offset-2 hover:underline"
          >
            {t("zamaList")}
          </a>
        ) : prize.firstDrawAt !== null ? (
          // Nothing has funded this pool yet, so the column answers the question behind the
          // question: not what the prize is, but when there will be one.
          <span className="block max-w-[8.5rem] text-[11.5px] leading-tight tabular-nums text-faint">
            {t("firstDraw", { time: format.clock(prize.firstDrawAt) })}
          </span>
        ) : (
          <span
            className={`text-[13px] tabular-nums ${selected ? "text-flameInk" : "text-parchment"}`}
          >
            {/* The shelf on the landing page says "unread" for the same reason: three dots is
                a promise that a figure is coming, and a read that failed is not coming. */}
            {prize.grand === null ? t("unread") : format.amount(prize.grand, pool.decimals)}
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * The path of the screen you are on, with the pool swapped.
 *
 * Only the pool segment moves, so a saver picking a token from the withdraw screen lands on the
 * withdraw screen. Paths that carry the pool in a query string instead, verify and the lab, get
 * the parameter rewritten.
 */
export function swapSlug(pathname: string, from: string, to: string): string {
  if (pathname.startsWith("/app")) {
    const rest = pathname.slice(`/app/${from}`.length);
    return pathname === "/app" || pathname === `/app/${from}` ? `/app/${to}` : `/app/${to}${rest}`;
  }
  return `${pathname}?pool=${to}`;
}
