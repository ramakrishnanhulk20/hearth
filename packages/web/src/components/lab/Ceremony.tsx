"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { Address } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { Providers } from "@/components/app/Providers";
import { PoolPicker } from "@/components/app/PoolPicker";
import { PoolProvider, useCurrentPool } from "@/components/app/PoolProvider";
import { ConnectBar } from "@/components/app/ConnectBar";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Banner, Button, Pill, SealedBars, Spinner } from "@/components/ui";
import { HEARTH_POOL_ABI, HEARTH_VAULT_ABI } from "@/lib/chain/abis";
import { TIER_KEYS } from "@/lib/chain/addresses";
import type { Pool } from "@/lib/chain/pools";
import { shortAddress, shortHandle } from "@/lib/format";
import { useFormat } from "@/hooks/useFormat";
import { usePoolReason } from "@/hooks/usePoolReason";
import { useErrorText } from "@/hooks/useErrorText";
import { useDraws, usePoolState, type DrawView } from "@/hooks/useHearth";
import { drawScope, useReveal, type Reveal } from "@/hooks/useReveal";

export function CeremonyScreen({ pool }: { pool: Pool }) {
  return (
    <Providers>
      <PoolProvider pool={pool}>
        <Ceremony />
      </PoolProvider>
    </Providers>
  );
}

type Stage = 0 | 1 | 2 | 3 | 4;

/** Keys into `lab.stages`, in the order the ceremony runs them. */
const STAGE_KEYS = ["sealed", "seed", "bracket", "thresholds", "mine"] as const;

function Ceremony() {
  const t = useTranslations("lab");
  const token = useCurrentPool();
  const say = usePoolReason();
  const pool = usePoolState();
  const { draws } = useDraws(pool.period);
  const { address } = useAccount();
  const reveal = useReveal();
  const reduced = useReducedMotion();

  const awarded = draws.filter((draw) => draw.status === "awarded");
  const [pinned, setPinned] = useState<number | null>(null);
  const draw = awarded.find((item) => item.drawId === pinned) ?? awarded[0] ?? null;

  const [stage, setStage] = useState<Stage>(0);
  // Bumped by the button rather than a boolean, so the effect below never has to switch a flag off
  // once the last stage lands: it simply stops scheduling.
  const [run, setRun] = useState(0);
  const running = run > 0 && stage < 4;

  useEffect(() => {
    if (run === 0 || stage >= 4) return;
    const delay = reduced ? 250 : [1400, 1800, 1600, 1600][stage];
    const timer = setTimeout(() => setStage((current) => (current + 1) as Stage), delay);
    return () => clearTimeout(timer);
  }, [run, stage, reduced]);

  const start = () => {
    setStage(0);
    setRun((current) => current + 1);
  };

  return (
    <div className="grain relative min-h-[100svh] bg-ink">
      <SiteHeader right={<ConnectBar />} />

      <main className="mx-auto w-full max-w-[68rem] px-4 pb-20 pt-8 sm:px-6">
        <div className="mb-6">
          <Pill tone="flame">{t("pill")}</Pill>
          <h1
            className="mt-4 font-display text-[clamp(2.1rem,6vw,4rem)] leading-[0.95] tracking-tightest text-parchment"
            style={{ fontWeight: 740 }}
          >
            {t("title")}
          </h1>
          <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-muted">{t("lede")}</p>
          <div className="mt-6 w-full max-w-[17rem]">
            <PoolPicker compact />
          </div>
        </div>

        {token.status !== "open" ? (
          <Banner tone="bad" title={t("noPool", { symbol: token.symbol })}>
            {t("noPoolBody", { reason: say(token.reason) })}
          </Banner>
        ) : draw === null ? (
          <Banner tone="info" title={t("noDraw")}>
            {t("noDrawBody")}
          </Banner>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              {awarded.map((item) => (
                <button
                  key={item.drawId}
                  type="button"
                  onClick={() => {
                    setPinned(item.drawId);
                    setStage(0);
                    setRun(0);
                  }}
                  className={`rounded-lg border px-3.5 py-2 text-[13px] tabular-nums transition-colors ${
                    draw.drawId === item.drawId
                      ? "border-flame/50 bg-flame/[0.08] text-flame"
                      : "border-hairline text-muted hover:border-hairlineStrong hover:text-parchment"
                  }`}
                >
                  {t("drawButton", { drawId: item.drawId })}
                </button>
              ))}
              <Button tone="primary" size="small" onClick={start} busy={running}>
                {stage === 0 ? t("openSeal") : t("again")}
              </Button>
              <span className="text-[12px] uppercase tracking-label text-faint">
                {t(`stages.${STAGE_KEYS[stage]}`)}
              </span>
            </div>

            <Stack
              draw={draw}
              stage={stage}
              address={address ?? null}
              reveal={reveal}
              decimals={token.decimals}
              symbol={token.symbol}
            />
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function Stack({
  draw,
  stage,
  address,
  reveal,
  decimals,
  symbol,
}: {
  draw: DrawView;
  stage: Stage;
  address: Address | null;
  reveal: Reveal;
  decimals: number;
  symbol: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Seals draw={draw} stage={stage} />
      <AnimatePresence>
        {stage >= 1 && <SeedCard key="seed" draw={draw} />}
        {stage >= 2 && <BracketCard key="bracket" draw={draw} decimals={decimals} />}
        {stage >= 3 && <ThresholdCard key="thresholds" draw={draw} address={address} />}
        {stage >= 4 && (
          <MineCard
            key="mine"
            draw={draw}
            reveal={reveal}
            connected={address !== null}
            decimals={decimals}
            symbol={symbol}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const rise = {
  initial: { opacity: 0, y: 26 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      {...rise}
      className={`glass-fill rounded-panel border border-hairline p-5 shadow-glass backdrop-blur-2xl sm:p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function Seals({ draw, stage }: { draw: DrawView; stage: Stage }) {
  const t = useTranslations("lab.seals");
  const handles = [
    { name: "seed", handle: draw.seedHandle },
    { name: "scale", handle: draw.scaleHandle },
    { name: "nonEmpty", handle: draw.nonEmptyHandle },
    { name: "harvest", handle: draw.harvestHandle },
  ];

  return (
    <div className="glass-fill rounded-panel border border-hairline p-5 shadow-glass backdrop-blur-2xl sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="label">{t("title")}</h2>
        <span className="text-[12px] text-faint">{t("hint")}</span>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {handles.map((entry, index) => (
          <motion.div
            key={entry.name}
            animate={stage >= 1 ? { borderColor: "rgba(249,209,0,0.4)" } : {}}
            transition={{ delay: index * 0.08, duration: 0.5 }}
            className="rounded-card border border-hairlineSoft bg-[rgba(10,10,10,0.5)] px-3.5 py-3"
          >
            <p className="text-[11px] uppercase tracking-label text-faint">{t(entry.name)}</p>
            <p className="mt-1 break-all font-sans text-[12px] tabular-nums text-white/35">
              {entry.handle === "0x" ? t("unpublished") : shortHandle(entry.handle)}
            </p>
          </motion.div>
        ))}
      </div>
      <p className="mt-4 text-[12.5px] leading-relaxed text-faint">{t("note")}</p>
    </div>
  );
}

function SeedCard({ draw }: { draw: DrawView }) {
  const t = useTranslations("lab.seed");

  return (
    <Card className="border-flame/30">
      <h2 className="label">{t("title")}</h2>
      <p
        className="mt-4 break-all font-display text-[clamp(1.6rem,5.5vw,3.4rem)] leading-none tracking-tightest text-flame"
        style={{ fontWeight: 700 }}
      >
        {draw.seed.toString()}
      </p>
      <p className="mt-4 max-w-[62ch] text-[12.5px] leading-relaxed text-muted">{t("note")}</p>
    </Card>
  );
}

function BracketCard({ draw, decimals }: { draw: DrawView; decimals: number }) {
  const t = useTranslations("lab.bracket");
  const tiers = useTranslations("dashboard.tiers");
  const format = useFormat();
  const bracket = format.count(draw.scaleBits > 0 ? 1n << BigInt(draw.scaleBits) : 0n);

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="label">{t("title")}</h2>
          <p
            className="mt-3 font-display text-[clamp(2rem,6vw,4rem)] leading-none tracking-tightest text-parchment"
            style={{ fontWeight: 700 }}
          >
            2<span className="align-super text-[0.55em]">{draw.scaleBits}</span>
          </p>
          <p className="mt-2 text-[13px] tabular-nums text-faint">{t("unit", { count: bracket })}</p>
        </div>
        <div className="flex gap-6">
          {TIER_KEYS.map((key, tier) => (
            <div key={key}>
              <p className="text-[11px] uppercase tracking-label text-faint">{tiers(key)}</p>
              <p className="mt-1 font-display text-[20px] tabular-nums text-parchment" style={{ fontWeight: 640 }}>
                {format.amount(draw.prize[tier], decimals)}
              </p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 max-w-[62ch] text-[12.5px] leading-relaxed text-muted">{t("note")}</p>
    </Card>
  );
}

function ThresholdCard({ draw, address }: { draw: DrawView; address: Address | null }) {
  const t = useTranslations("lab.thresholds");
  const tiers = useTranslations("dashboard.tiers");
  const format = useFormat();
  const token = useCurrentPool();
  const vault = token.status === "open" ? token.vault : null;
  const pool = token.status === "open" ? token.pool : null;

  const { data: params } = useReadContracts({
    query: { enabled: pool !== null },
    contracts: pool ? [{ address: pool, abi: HEARTH_POOL_ABI, functionName: "drawParams", args: [draw.drawId] }] : [],
  });

  const counts = useMemo(() => {
    const entry = params?.[0];
    if (!entry || entry.status !== "success") return [1, 1, 4];
    return entry.result.prizeCount.map((value) => Number(value));
  }, [params]);

  const requests = useMemo(() => {
    const list: { tier: number; index: number }[] = [];
    counts.forEach((count, tier) => {
      for (let index = 0; index < count; index++) list.push({ tier, index });
    });
    return list;
  }, [counts]);

  const { data } = useReadContracts({
    query: { enabled: vault !== null && address !== null },
    contracts:
      vault && address
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
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="label">{t("title")}</h2>
        <span className="text-[12px] text-faint">
          {address ? shortAddress(address) : t("connectHint")}
        </span>
      </div>

      {!address ? (
        <p className="mt-4 text-[13px] leading-relaxed text-muted">{t("connectBody")}</p>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {requests.map((request, slot) => {
            const entry = data?.[slot];
            const ok = entry && entry.status === "success";
            const threshold = ok ? entry.result[0] : null;
            const skipped = ok ? entry.result[1] : false;
            return (
              <motion.div
                key={`${request.tier}-${request.index}`}
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: slot * 0.09, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-card border border-hairlineSoft bg-[rgba(10,10,10,0.5)] px-3.5 py-3"
              >
                <p className="text-[11px] uppercase tracking-label text-faint">
                  {t("row", { tier: tiers(TIER_KEYS[request.tier]), index: request.index + 1 })}
                </p>
                <p className="mt-1 font-display text-[17px] tabular-nums text-parchment" style={{ fontWeight: 620 }}>
                  {!ok ? t("reading") : skipped ? t("outOfRange") : format.count(threshold!)}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}

      <p className="mt-4 max-w-[62ch] text-[12.5px] leading-relaxed text-muted">{t("note")}</p>
    </Card>
  );
}

function MineCard({
  draw,
  reveal,
  connected,
  decimals,
  symbol,
}: {
  draw: DrawView;
  reveal: Reveal;
  connected: boolean;
  decimals: number;
  symbol: string;
}) {
  const t = useTranslations("lab.mine");
  const revealWords = useTranslations("console.reveal");
  const format = useFormat();
  const errorText = useErrorText();
  const token = useCurrentPool();
  const vault = token.status === "open" ? token.vault : null;
  const view = reveal.scope(drawScope(draw.drawId));
  const mine = draw.mine;
  const weight = mine ? view.read(mine.weightHandle) : null;
  const credit = mine ? view.read(mine.creditHandle) : null;
  const open = view.open;
  const nothingOfMine = !mine || (!mine.weightHandle && !mine.creditHandle);

  return (
    <Card className="border-flame/30">
      <h2 className="label">{t("title")}</h2>

      {!connected ? (
        <p className="mt-4 text-[13px] leading-relaxed text-muted">
          {t("connectBody", { drawId: draw.drawId })}
        </p>
      ) : nothingOfMine ? (
        <p className="mt-4 text-[13px] leading-relaxed text-muted">
          {t("nothing", { drawId: draw.drawId })}
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-label text-faint">{t("weight")}</p>
              <p className="mt-2 font-display text-[clamp(1.4rem,4vw,2.4rem)] leading-none tabular-nums tracking-tight text-parchment" style={{ fontWeight: 660 }}>
                {open && weight !== null ? format.count(weight) : <SealedBars count={5} />}
              </p>
              <p className="mt-1.5 text-[12px] text-faint">{t("weightUnit")}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-label text-faint">{t("paid")}</p>
              <p className="mt-2 font-display text-[clamp(1.4rem,4vw,2.4rem)] leading-none tabular-nums tracking-tight text-flame" style={{ fontWeight: 660 }}>
                {open && credit !== null ? format.amount(credit, decimals) : <SealedBars count={4} />}
              </p>
              <p className="mt-1.5 text-[12px] text-faint">{t("paidUnit", { symbol })}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-hairlineSoft pt-4">
            {open ? (
              <Button size="small" onClick={view.hide}>
                {t("sealAgain")}
              </Button>
            ) : (
              <Button
                size="small"
                tone="primary"
                busy={view.state.kind === "working"}
                onClick={() =>
                  vault &&
                  mine &&
                  view.reveal([
                    { handle: mine.weightHandle, contractAddress: vault },
                    { handle: mine.creditHandle, contractAddress: vault },
                  ])
                }
              >
                {t("decrypt")}
              </Button>
            )}
            {view.state.kind === "working" && (
              <span className="flex items-center gap-2 text-[12.5px] text-muted">
                <Spinner size={13} />
                {revealWords(view.state.note)}
              </span>
            )}
            {view.state.kind === "denied" && (
              <span className="text-[12.5px] text-bad">{t("denied")}</span>
            )}
            {view.state.kind === "failed" && (
              <span className="text-[12.5px] text-bad">{errorText(view.state.error)}</span>
            )}
          </div>
        </>
      )}

      <p className="mt-4 max-w-[62ch] text-[12.5px] leading-relaxed text-muted">{t("note")}</p>
    </Card>
  );
}
