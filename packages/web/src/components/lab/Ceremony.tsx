"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Address } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { Providers } from "@/components/app/Providers";
import { ConnectBar } from "@/components/app/ConnectBar";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Banner, Button, Pill, SealedBars, Spinner } from "@/components/ui";
import { HEARTH_POOL_ABI, HEARTH_VAULT_ABI } from "@/lib/chain/abis";
import { HEARTH, TIER_NAMES } from "@/lib/chain/addresses";
import { formatAmount, shortAddress, shortHandle } from "@/lib/format";
import { useDraws, usePoolState, type DrawView } from "@/hooks/useHearth";
import { drawScope, useReveal, type Reveal } from "@/hooks/useReveal";

export function CeremonyScreen() {
  return (
    <Providers>
      <Ceremony />
    </Providers>
  );
}

type Stage = 0 | 1 | 2 | 3 | 4;

const STAGE_NAMES = ["sealed", "the seed opens", "the bracket", "the thresholds fall", "your own result"] as const;

function Ceremony() {
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
          <Pill tone="flame">Lab page</Pill>
          <h1
            className="mt-4 font-display text-[clamp(2.1rem,6vw,4rem)] leading-[0.95] tracking-tightest text-parchment"
            style={{ fontWeight: 740 }}
          >
            The draw ceremony
          </h1>
          <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-muted">
            Not linked from the site. Every number below is read live from the contracts on Sepolia:
            the sealed handles, the seed the key management service signed, the bracket the draw ran
            against, and the exact thresholds a wallet had to beat.
          </p>
        </div>

        {draw === null ? (
          <Banner tone="info" title="No awarded draw to open yet.">
            The ceremony needs a draw that has been closed and awarded. Run one from the draw panel in
            the pool, then come back.
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
                  Draw {item.drawId}
                </button>
              ))}
              <Button tone="primary" size="small" onClick={start} busy={running}>
                {stage === 0 ? "Open the seal" : "Run it again"}
              </Button>
              <span className="text-[12px] uppercase tracking-label text-faint">
                {STAGE_NAMES[stage]}
              </span>
            </div>

            <Stack draw={draw} stage={stage} address={address ?? null} reveal={reveal} />
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
}: {
  draw: DrawView;
  stage: Stage;
  address: Address | null;
  reveal: Reveal;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Seals draw={draw} stage={stage} />
      <AnimatePresence>
        {stage >= 1 && <SeedCard key="seed" draw={draw} />}
        {stage >= 2 && <BracketCard key="bracket" draw={draw} />}
        {stage >= 3 && <ThresholdCard key="thresholds" draw={draw} address={address} />}
        {stage >= 4 && <MineCard key="mine" draw={draw} reveal={reveal} connected={address !== null} />}
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
  const handles = [
    { name: "seed", handle: draw.seedHandle },
    { name: "scale count", handle: draw.scaleHandle },
    { name: "non-empty", handle: draw.nonEmptyHandle },
    { name: "harvest", handle: draw.harvestHandle },
  ];

  return (
    <div className="glass-fill rounded-panel border border-hairline p-5 shadow-glass backdrop-blur-2xl sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="label">What the close published</h2>
        <span className="text-[12px] text-faint">four handles, in this exact order</span>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {handles.map((entry, index) => (
          <motion.div
            key={entry.name}
            animate={stage >= 1 ? { borderColor: "rgba(249,209,0,0.4)" } : {}}
            transition={{ delay: index * 0.08, duration: 0.5 }}
            className="rounded-card border border-hairlineSoft bg-[rgba(10,10,10,0.5)] px-3.5 py-3"
          >
            <p className="text-[11px] uppercase tracking-label text-faint">{entry.name}</p>
            <p className="mt-1 break-all font-sans text-[12px] tabular-nums text-white/35">
              {entry.handle === "0x" ? "not published" : shortHandle(entry.handle)}
            </p>
          </motion.div>
        ))}
      </div>
      <p className="mt-4 text-[12.5px] leading-relaxed text-faint">
        The pool re-encodes the four cleartexts in that order and checks the key management
        service&apos;s signature over that encoding on chain, so asking for them in any other order
        makes the award revert. Order is the contract here, not a convenience.
      </p>
    </div>
  );
}

function SeedCard({ draw }: { draw: DrawView }) {
  return (
    <Card className="border-flame/30">
      <h2 className="label">The seed opens</h2>
      <p
        className="mt-4 break-all font-display text-[clamp(1.6rem,5.5vw,3.4rem)] leading-none tracking-tightest text-flame"
        style={{ fontWeight: 700 }}
      >
        {draw.seed.toString()}
      </p>
      <p className="mt-4 max-w-[62ch] text-[12.5px] leading-relaxed text-muted">
        Generated as a ciphertext inside Zama&apos;s coprocessor, so nobody saw it when it was drawn.
        Published once the period ended, signed by the key management service, and verified on chain by
        the pool before anything else in this draw was allowed to happen. Prize sizes were already fixed
        at the close, before this number existed.
      </p>
    </Card>
  );
}

function BracketCard({ draw }: { draw: DrawView }) {
  const bracket = draw.scaleBits > 0 ? (1n << BigInt(draw.scaleBits)).toLocaleString("en-US") : "0";
  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="label">The bracket</h2>
          <p
            className="mt-3 font-display text-[clamp(2rem,6vw,4rem)] leading-none tracking-tightest text-parchment"
            style={{ fontWeight: 700 }}
          >
            2<span className="align-super text-[0.55em]">{draw.scaleBits}</span>
          </p>
          <p className="mt-2 text-[13px] tabular-nums text-faint">{bracket} balance-seconds</p>
        </div>
        <div className="flex gap-6">
          {TIER_NAMES.map((name, tier) => (
            <div key={name}>
              <p className="text-[11px] uppercase tracking-label text-faint">{name}</p>
              <p className="mt-1 font-display text-[20px] tabular-nums text-parchment" style={{ fontWeight: 640 }}>
                {formatAmount(draw.prize[tier])}
              </p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 max-w-[62ch] text-[12.5px] leading-relaxed text-muted">
        The draw runs against the smallest power of two above the pool&apos;s aggregate weight, never the
        aggregate itself. Publishing the exact total would let anyone solve for a lone mover&apos;s
        deposit from two consecutive totals and the timestamp of their own transaction.
      </p>
    </Card>
  );
}

function ThresholdCard({ draw, address }: { draw: DrawView; address: Address | null }) {
  const vault = HEARTH.vault;
  const pool = HEARTH.pool;

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
        <h2 className="label">The thresholds fall</h2>
        <span className="text-[12px] text-faint">
          {address ? shortAddress(address) : "connect a wallet to see your own"}
        </span>
      </div>

      {!address ? (
        <p className="mt-4 text-[13px] leading-relaxed text-muted">
          Thresholds are per address and public. Connect a wallet and the exact number it had to beat in
          every prize of this draw appears here, computed by the vault, not by this page.
        </p>
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
                  {TIER_NAMES[request.tier]} prize {request.index + 1}
                </p>
                <p className="mt-1 font-display text-[17px] tabular-nums text-parchment" style={{ fontWeight: 620 }}>
                  {!ok ? "reading" : skipped ? "out of range" : threshold!.toLocaleString("en-US")}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}

      <p className="mt-4 max-w-[62ch] text-[12.5px] leading-relaxed text-muted">
        Beat the threshold and the prize is yours. These come from the vault&apos;s own view, the same
        arithmetic that decided the outcome, so there is no second implementation here to disagree with
        the first.
      </p>
    </Card>
  );
}

function MineCard({
  draw,
  reveal,
  connected,
}: {
  draw: DrawView;
  reveal: Reveal;
  connected: boolean;
}) {
  const vault = HEARTH.vault;
  const view = reveal.scope(drawScope(draw.drawId));
  const mine = draw.mine;
  const weight = mine ? view.read(mine.weightHandle) : null;
  const credit = mine ? view.read(mine.creditHandle) : null;
  const open = view.open;
  const nothingOfMine = !mine || (!mine.weightHandle && !mine.creditHandle);

  return (
    <Card className="border-flame/30">
      <h2 className="label">And only for you</h2>

      {!connected ? (
        <p className="mt-4 text-[13px] leading-relaxed text-muted">
          Connect a wallet and this card fills in with the weight it was judged on and what draw{" "}
          {draw.drawId} paid it, decrypted in your browser and nowhere else.
        </p>
      ) : nothingOfMine ? (
        <p className="mt-4 text-[13px] leading-relaxed text-muted">
          This wallet holds no weight in draw {draw.drawId}, so there is nothing of its own to open. Only
          a saver who was in the walk has a weight and a credit here.
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-label text-faint">Your weight</p>
              <p className="mt-2 font-display text-[clamp(1.4rem,4vw,2.4rem)] leading-none tabular-nums tracking-tight text-parchment" style={{ fontWeight: 660 }}>
                {open && weight !== null ? weight.toLocaleString("en-US") : <SealedBars count={5} />}
              </p>
              <p className="mt-1.5 text-[12px] text-faint">balance-seconds over the period</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-label text-faint">What this draw paid you</p>
              <p className="mt-2 font-display text-[clamp(1.4rem,4vw,2.4rem)] leading-none tabular-nums tracking-tight text-flame" style={{ fontWeight: 660 }}>
                {open && credit !== null ? `${formatAmount(credit)}` : <SealedBars count={4} />}
              </p>
              <p className="mt-1.5 text-[12px] text-faint">USDC, credited to your winnings</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-hairlineSoft pt-4">
            {open ? (
              <Button size="small" onClick={view.hide}>
                Seal it again
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
                Decrypt my result
              </Button>
            )}
            {view.state.kind === "working" && (
              <span className="flex items-center gap-2 text-[12.5px] text-muted">
                <Spinner size={13} />
                {view.state.note}
              </span>
            )}
            {view.state.kind === "denied" && (
              <span className="text-[12.5px] text-bad">Refused: these values belong to another wallet.</span>
            )}
            {view.state.kind === "failed" && (
              <span className="text-[12.5px] text-bad">{view.state.error.message}</span>
            )}
          </div>
        </>
      )}

      <p className="mt-4 max-w-[62ch] text-[12.5px] leading-relaxed text-muted">
        Everything above this card is public and anyone can check it. This card is not: it takes one
        EIP-712 signature from the wallet that owns these values, and Zama&apos;s access control list
        refuses everybody else. That is the whole product in two paragraphs.
      </p>
    </Card>
  );
}
