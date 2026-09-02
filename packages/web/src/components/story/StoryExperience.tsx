"use client";

import { AdaptiveDpr, Environment, Lightformer, Preload, Scroll, ScrollControls, useScroll } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import type { PoolStats } from "@/lib/chain/pool";
import { useMessages } from "@/i18n/LocaleProvider";
import { SealedHandle } from "@/components/home/SealedHandle";
import { DepositCoins, DrawSpark, FocalLantern, LanternCrowd, SealPulse, useLanternField } from "./lanterns";

const depositSignal = { current: 0 };

const closeSignal = { current: 0 };

const PAGES = 8;

type Key = { at: number; pos: [number, number, number]; look: [number, number, number] };

function sampleKeys(keys: Key[], t: number, outPos: THREE.Vector3, outLook: THREE.Vector3) {
  const clamped = Math.min(1, Math.max(0, t));
  let a = keys[0];
  let b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (clamped >= keys[i].at && clamped <= keys[i + 1].at) {
      a = keys[i];
      b = keys[i + 1];
      break;
    }
  }
  const span = b.at - a.at || 1;
  const raw = (clamped - a.at) / span;

  const k = raw * raw * (3 - 2 * raw);
  outPos.set(
    a.pos[0] + (b.pos[0] - a.pos[0]) * k,
    a.pos[1] + (b.pos[1] - a.pos[1]) * k,
    a.pos[2] + (b.pos[2] - a.pos[2]) * k,
  );
  outLook.set(
    a.look[0] + (b.look[0] - a.look[0]) * k,
    a.look[1] + (b.look[1] - a.look[1]) * k,
    a.look[2] + (b.look[2] - a.look[2]) * k,
  );
}

function World() {
  const scroll = useScroll();
  const { camera } = useThree();
  const field = useLanternField(420);

  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const smoothLook = useRef(new THREE.Vector3(0, 0, 0));

  const reveal = useRef(0);
  const winner = useRef(-1);
  const winGlow = useRef(0);
  const deposit = useRef(0);
  const focalBoost = useRef(0);
  const draw = useRef(0);

  const winnerIndex = useMemo(() => 40 + Math.floor(Math.random() * (field.length - 80)), [field.length]);
  winner.current = winnerIndex;
  const withdraw = useRef(0);

  const KEYS = useMemo<Key[]>(() => {
    const w = field[winnerIndex].position;
    return [
      { at: 0.0, pos: [0.7, 0.15, 4.3], look: [0, 0, 0] },
      { at: 0.08, pos: [1.1, 0.55, 3.7], look: [0, 0.25, 0] },
      { at: 0.24, pos: [0.5, 0.6, 3.9], look: [0, 0.1, 0] },
      { at: 0.4, pos: [2.5, 7.5, 13], look: [0, -2.5, -10] },
      { at: 0.52, pos: [0, 5.5, 14], look: [0, -3, -18] },
      { at: 0.66, pos: [w[0] + 1.4, w[1] + 1.8, w[2] + 6.5], look: [w[0], w[1] + 0.3, w[2]] },
      { at: 0.8, pos: [w[0] + 1.0, w[1] + 1.5, w[2] + 5.7], look: [w[0], w[1] + 0.3, w[2]] },
      { at: 0.9, pos: [1.6, 1.1, 5.2], look: [0, 0.25, 0] },
      { at: 1.0, pos: [0, 8, 19], look: [0, -3, -13] },
    ];
  }, [field, winnerIndex]);

  useFrame((_, delta) => {
    const t = scroll.offset;
    const k = Math.min(1, delta * 3.5);

    sampleKeys(KEYS, t, pos, look);
    camera.position.lerp(pos, k);
    smoothLook.current.lerp(look, k);
    camera.lookAt(smoothLook.current);

    const dep = THREE.MathUtils.clamp((t - 0.05) / 0.15, 0, 1);
    deposit.current = dep;
    depositSignal.current = dep;
    const boostTarget = t < 0.28 ? dep : 0.18;
    focalBoost.current += (boostTarget - focalBoost.current) * k;

    reveal.current = THREE.MathUtils.clamp((t - 0.28) / 0.14, 0, 1);

    draw.current = THREE.MathUtils.clamp((t - 0.5) / 0.15, 0, 1);

    winGlow.current = THREE.MathUtils.clamp((t - 0.66) / 0.12, 0, 1);

    withdraw.current = THREE.MathUtils.clamp((t - 0.82) / 0.14, 0, 1);

    closeSignal.current = t;
  });

  return (
    <>
      <color attach="background" args={["#050505"]} />
      <fogExp2 attach="fog" args={["#050505", 0.02]} />
      <ambientLight intensity={0.12} />

      <Environment resolution={128}>
        <Lightformer form="rect" intensity={1.4} position={[-3, 3, 2]} scale={[5, 6, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={1.1} position={[3, -2, 1.5]} scale={[4, 4, 1]} color="#f9d100" />
        <Lightformer form="rect" intensity={0.9} position={[0, 0.4, -4]} scale={[0.6, 5, 1]} color="#fff4e0" />
      </Environment>

      <LanternCrowd field={field} refs={{ reveal, winner, winGlow }} />
      <FocalLantern brightness={1} fill={0} boostRef={focalBoost} />
      <DepositCoins progressRef={deposit} />
      <DepositCoins progressRef={withdraw} reverse />
      <SealPulse progressRef={deposit} />
      <DrawSpark progressRef={draw} target={field[winnerIndex].position} />
    </>
  );
}

export function StoryExperience({ stats }: { stats?: PoolStats | null }) {
  return (
    <div className="h-[100svh] w-full bg-[#050505]">
      <Canvas
        camera={{ position: [0.7, 0.15, 4.3], fov: 38 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <EffectComposer>
          <Bloom intensity={0.75} luminanceThreshold={0.72} luminanceSmoothing={0.28} mipmapBlur radius={0.7} />
          <Vignette eskil={false} offset={0.2} darkness={0.85} />
        </EffectComposer>

        <ScrollControls pages={PAGES} damping={0.25}>
          <World />
          <Scroll html style={{ width: "100%" }}>
            <Caption page={0}>
              <p className="label mb-5">A world of lanterns</p>
              <h2 className="max-w-[16ch] font-display text-[clamp(2.4rem,6vw,5rem)] leading-[0.95] tracking-tightest text-white" style={{ fontWeight: 740 }}>
                One lantern. Sealed, and lit only for its holder.
              </h2>
            </Caption>

            <Caption page={1}>
              <p className="label mb-5">You deposit</p>
              <h2 className="max-w-[18ch] font-display text-[clamp(2.2rem,5.5vw,4.6rem)] leading-[0.98] tracking-tightest text-white" style={{ fontWeight: 740 }}>
                You fill it, and the amount seals shut.
              </h2>
              <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-white/55">
                What you put in turns to ciphertext the moment it lands. From here on the number is
                yours alone.
              </p>
              <Ciphertext />
            </Caption>

            <Caption page={3} align="right">
              <h2 className="ml-auto max-w-[18ch] text-right font-display text-[clamp(2.2rem,5.5vw,4.6rem)] leading-[0.98] tracking-tightest text-white" style={{ fontWeight: 740 }}>
                And it is one of thousands.
              </h2>
              <p className="ml-auto mt-4 max-w-[36ch] text-right text-[15px] leading-relaxed text-white/55">
                A pool of savers, every one glowing, not one of them readable. This is what
                confidentiality looks like before a single word explains it.
              </p>
            </Caption>

            <Caption page={4}>
              <p className="label mb-5">The draw</p>
              <h2 className="max-w-[18ch] font-display text-[clamp(2.2rem,5.5vw,4.6rem)] leading-[0.98] tracking-tightest text-white" style={{ fontWeight: 740 }}>
                A spark crosses the pool and stops at one.
              </h2>
              <p className="mt-4 max-w-[36ch] text-[15px] leading-relaxed text-white/55">
                Chosen at random on chain, weighted by deposit, and known to no one. Not to you, not
                to whoever started the draw. It simply stops, and goes dark.
              </p>
            </Caption>

            <Caption page={6} align="right">
              <p className="label mb-5 justify-end">The win</p>
              <h2 className="ml-auto max-w-[18ch] text-right font-display text-[clamp(2.2rem,5.5vw,4.6rem)] leading-[0.98] tracking-tightest text-white" style={{ fontWeight: 740 }}>
                One lantern fills with gold.
              </h2>
              <p className="ml-auto mt-4 max-w-[38ch] text-right text-[15px] leading-relaxed text-white/55">
                The prize is paid, and sealed. Only its holder will ever see it light. To everyone
                else in the pool, nothing changed at all.
              </p>
            </Caption>

          </Scroll>
        </ScrollControls>
        <AdaptiveDpr pixelated />
        <Preload all />
      </Canvas>

      <CloseOverlay stats={stats ?? null} />
    </div>
  );
}

function CloseOverlay({ stats }: { stats: PoolStats | null }) {
  const m = useMessages();
  const ref = useRef<HTMLDivElement | null>(null);
  const inner = useRef<HTMLDivElement | null>(null);
  const foot = useRef<HTMLElement | null>(null);
  const jackpot = stats ? (stats.jackpot > 0 ? stats.jackpot : 0) : null;

  useEffect(() => {
    let frame = 0;
    const loop = () => {
      const shown = THREE.MathUtils.clamp((closeSignal.current - 0.85) / 0.1, 0, 1);
      if (ref.current) ref.current.style.opacity = String(shown);

      const pe = shown > 0.5 ? "auto" : "none";
      if (inner.current) inner.current.style.pointerEvents = pe;
      if (foot.current) foot.current.style.pointerEvents = pe;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed inset-0 z-40 flex items-center opacity-0 transition-opacity"
      style={{ opacity: 0 }}
    >
      <div
        ref={inner}
        className="pointer-events-none mx-auto grid w-full max-w-[92rem] grid-cols-1 items-end gap-10 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:px-16"
      >
        <div>
          <p className="label mb-5">{m.cycle.steps[3].tag}</p>
          <h2
            className="max-w-[15ch] font-display text-[clamp(2.6rem,7vw,6rem)] leading-[0.9] tracking-tightest text-white"
            style={{ fontWeight: 760 }}
          >
            {m.closing.title}
          </h2>
          <p className="mt-5 max-w-[40ch] text-[16px] leading-relaxed text-white/60">{m.closing.sub}</p>

          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link
              href="/app"
              prefetch
              className="group inline-flex items-center gap-2.5 rounded-lg bg-flameFill px-7 py-4 text-[15px] font-medium text-onFlame transition-transform duration-200 hover:scale-[1.02]"
            >
              {m.nav.openApp}
              <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
                &rarr;
              </span>
            </Link>
            {jackpot !== null && (
              <span className="text-[14px] text-white/55">
                <span className="font-display tabular-nums text-flame" style={{ fontWeight: 620 }}>
                  {jackpot.toLocaleString()} USDC
                </span>{" "}
                {m.hero.liveJackpot.toLowerCase()}
              </span>
            )}
          </div>
        </div>

        <SealedHandle handle={stats?.sealedHandle ?? null} owner={stats?.sealedOwner ?? null} />
      </div>

      <StoryFooter footRef={foot} openApp={m.nav.openApp} />
    </div>
  );
}

function StoryFooter({
  footRef,
  openApp,
}: {
  footRef: React.MutableRefObject<HTMLElement | null>;
  openApp: string;
}) {
  return (
    <footer
      ref={footRef}
      style={{ pointerEvents: "none" }}
      className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/25 px-6 py-5 backdrop-blur-sm lg:px-16"
    >
      <div className="mx-auto flex max-w-[92rem] flex-col items-center justify-between gap-3 text-[13px] sm:flex-row">
        <div className="flex items-center gap-2.5 text-white/45">
          <span className="relative block h-[15px] w-[11px]" aria-hidden>
            <span className="absolute inset-x-0 bottom-0 top-[3px] rounded-[2px] border border-flame/60 bg-flame/15" />
            <span className="absolute left-1/2 top-0 h-[4px] w-[6px] -translate-x-1/2 rounded-t-full border border-b-0 border-flame/60" />
          </span>
          <span className="font-display text-white/70" style={{ fontWeight: 620 }}>
            Lantern
          </span>
          <span className="hidden text-white/25 sm:inline">·</span>
          <span className="hidden sm:inline">Prize savings nobody can see inside</span>
        </div>
        <nav className="flex items-center gap-6">
          <Link href="/how" prefetch className="text-white/55 transition-colors hover:text-white">
            How it works
          </Link>
          <Link href="/app" prefetch className="text-white/55 transition-colors hover:text-white">
            {openApp}
          </Link>
          <a
            href="https://www.zama.ai/fhevm"
            target="_blank"
            rel="noopener noreferrer"
            className="text-flame/80 transition-colors hover:text-flame"
          >
            Built on Zama FHE
          </a>
        </nav>
      </div>
    </footer>
  );
}

function Ciphertext() {
  const [display, setDisplay] = useState<{ sealed: boolean; text: string }>({ sealed: false, text: "$0" });

  useEffect(() => {
    let frame = 0;
    const loop = () => {
      const p = depositSignal.current;
      if (p < 0.9) {
        const amount = Math.round((p / 0.9) * 500);
        setDisplay({ sealed: false, text: `$${amount.toLocaleString()}` });
      } else {
        setDisplay({
          sealed: true,
          text: "0x" + Array.from({ length: 16 }, () => "0123456789abcdef"[(Math.random() * 16) | 0]).join(""),
        });
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <p
      className={`mt-6 font-display text-[clamp(1.3rem,2.6vw,2rem)] tabular-nums tracking-tight transition-colors ${
        display.sealed ? "text-flame/60" : "text-flame"
      }`}
    >
      {display.text}
    </p>
  );
}

function Caption({
  children,
  page,
  align = "left",
}: {
  children: React.ReactNode;
  page: number;
  align?: "left" | "right";
}) {
  return (
    <div
      className="pointer-events-none absolute left-0 flex w-full items-center px-6 lg:px-16"
      style={{ top: `${page * 100}svh`, height: "100svh" }}
    >
      <div className={`mx-auto w-full max-w-[92rem] ${align === "right" ? "text-right" : ""}`}>
        {children}
      </div>
    </div>
  );
}
