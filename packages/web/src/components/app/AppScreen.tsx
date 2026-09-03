"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { Providers } from "./Providers";
import { ConnectBar, useReady } from "./ConnectBar";
import { Banners } from "./Banners";
import { PoolPanel } from "./PoolPanel";
import { DepositPanel } from "./DepositPanel";
import { BalancePanel } from "./BalancePanel";
import { DrawsPanel } from "./DrawsPanel";
import { WithdrawPanel } from "./WithdrawPanel";
import { DrawControls } from "./DrawControls";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Banner, PhaseNote } from "@/components/ui";
import { CONFIGURED } from "@/lib/chain/addresses";
import { useActions } from "@/hooks/useActions";
import { useReveal } from "@/hooks/useReveal";
import { useUnshield } from "@/hooks/useUnshield";
import {
  useActivity,
  useDraws,
  useHearthConfig,
  useNow,
  usePoolState,
  useSaverState,
  useTokenLayer,
} from "@/hooks/useHearth";
import { sceneSignals as S } from "@/components/scene/signals";
import { useActionScene, usePeekScene } from "@/hooks/useSceneReactions";

const AppScene = dynamic(() => import("@/components/scene/AppScene"), { ssr: false });

export function AppScreen() {
  return (
    <Providers>
      <Console />
    </Providers>
  );
}

/** Eases the hearth up to a resting brightness once a wallet is on the right network. */
function SceneDriver() {
  const ready = useReady();
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let sinceIgnite = ready ? 0 : 999;
    const loop = (now: number) => {
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      sinceIgnite += delta;
      const rate = 1 - Math.pow(0.05, delta);
      const target = ready ? (sinceIgnite < 0.45 ? 1.6 : 1) : 0.05;
      S.brightness.current += (target - S.brightness.current) * rate;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [ready]);
  return null;
}

function Console() {
  const config = useHearthConfig();
  const pool = usePoolState();
  const saver = useSaverState(config);
  const token = useTokenLayer(config);
  const { draws, refetch: refetchDraws } = useDraws(pool.period);
  const { activity, error: activityError } = useActivity();
  const reveal = useReveal();
  const now = useNow();

  // One wallet sends one transaction at a time, so one action instance drives every button and
  // one note reports it. Two instances would let the page claim two things are in flight.
  const actions = useActions(config);
  const unshield = useUnshield(config);

  useActionScene(actions.phase, actions.label);
  usePeekScene(reveal.active);

  const refresh = () => {
    pool.refetch();
    saver.refetch();
    refetchDraws();
  };

  if (!CONFIGURED) {
    return (
      <div className="grain relative min-h-[100svh]">
        <SiteHeader right={<ConnectBar />} />
        <main className="mx-auto w-full max-w-[76rem] px-4 py-10 sm:px-6">
          <Banner tone="bad" title="Hearth is not configured.">
            NEXT_PUBLIC_HEARTH_VAULT, NEXT_PUBLIC_HEARTH_POOL and NEXT_PUBLIC_HEARTH_SOURCE have to be
            set for this page to read anything. They are in packages/web/.env.example.
          </Banner>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="grain relative min-h-[100svh]">
      <SmoothScroll />
      <AppScene />
      <SceneDriver />

      <div className="relative z-10">
        <SiteHeader right={<ConnectBar />} />

        <main className="mx-auto w-full max-w-[76rem] px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
          <div className="mb-6">
            <h1
              className="font-display text-[clamp(2rem,5vw,3.2rem)] leading-[0.98] tracking-tightest text-parchment"
              style={{ fontWeight: 720 }}
            >
              Save together.
              <br />
              Nobody sees how much.
            </h1>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-muted">
              Deposit confidential USDC, keep your balance encrypted on chain, and take a share of the
              prize every hour with odds proportional to what you held. Principal comes back in full,
              whenever you ask.
            </p>
          </div>

          <div className="mb-6">
            <Banners
              pool={pool}
              saver={saver}
              token={token}
              activity={activity}
              activityError={activityError}
              periodLength={config.periodLength}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
            <div className="flex flex-col gap-4">
              <DepositPanel
                config={config}
                pool={pool}
                saver={saver}
                draws={draws}
                money={actions}
                refresh={refresh}
              />
              <BalancePanel config={config} saver={saver} reveal={reveal} />
              <DrawsPanel
                config={config}
                saver={saver}
                draws={draws}
                now={now}
                reveal={reveal}
                money={actions}
                refresh={refresh}
              />
              <WithdrawPanel
                config={config}
                saver={saver}
                draws={draws}
                reveal={reveal}
                money={actions}
                unshield={unshield}
                refresh={refresh}
              />
            </div>

            <div className="flex flex-col gap-4 lg:sticky lg:top-20">
              <PoolPanel pool={pool} now={now} periodLength={config.periodLength} />
              <DrawControls
                pool={pool}
                saver={saver}
                draws={draws}
                now={now}
                draw={actions}
                refresh={refresh}
              />
            </div>
          </div>
        </main>

        <SiteFooter />
      </div>

      {actions.phase.kind !== "idle" && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4">
          <div className="pointer-events-auto w-full max-w-2xl">
            <PhaseNote phase={actions.phase} label={actions.label} onDismiss={actions.reset} />
          </div>
        </div>
      )}
    </div>
  );
}
