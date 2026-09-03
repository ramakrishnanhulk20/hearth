"use client";

import { AdaptiveDpr, Environment, Lightformer, Preload, Scroll, ScrollControls, useScroll } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import Link from "next/link";
import * as THREE from "three";
import type { PoolStats } from "@/lib/chain/read";
import { SealedHandle } from "@/components/home/SealedHandle";
import { DepositCoins, DrawSpark, FocalFlame, FlameCrowd, SealPulse, useFlameField } from "@/components/scene/flames";
import { formatAmount } from "@/lib/format";

/** Scroll progress republished as plain numbers, so the overlay never re-renders per frame. */
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
  const field = useFlameField(420);

  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const smoothLook = useRef(new THREE.Vector3(0, 0, 0));

  const reveal = useRef(0);
  const winner = useRef(-1);
  const winGlow = useRef(0);
  const deposit = useRef(0);
  const focalBoost = useRef(0);
  const draw = useRef(0);
  const withdraw = useRef(0);

  // The flame the spark stops at, chosen deterministically from the field's own geometry: the one
  // closest to a point the camera passes through in the middle of the draw. A random pick here
  // would make the story a different story on every render.
  const winnerIndex = useMemo(() => {
    let best = 40;
    let bestScore = Infinity;
    field.forEach((flame, index) => {
      const depth = -flame.position[2];
      if (depth < 18 || depth > 34) return;
      const score = Math.abs(flame.position[0] + 3) + Math.abs(depth - 26);
      if (score < bestScore) {
        bestScore = score;
        best = index;
      }
    });
    return best;
  }, [field]);

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
    winner.current = winnerIndex;

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

      <FlameCrowd field={field} refs={{ reveal, winner, winGlow }} />
      <FocalFlame brightness={1} fill={0} boostRef={focalBoost} />
      <DepositCoins progressRef={deposit} />
      <DepositCoins progressRef={withdraw} reverse />
      <SealPulse progressRef={deposit} />
      <DrawSpark progressRef={draw} target={field[winnerIndex].position} />
    </>
  );
}

/** The six captions, written once and laid out twice: over the scene, or stacked in a still page. */
const CAPTIONS: { page: number; align: "left" | "right"; body: React.ReactNode }[] = [
  {
    page: 0,
    align: "left",
    body: (
      <>
        <p className="label mb-5">Confidential prize savings</p>
        <h2
          className="max-w-[16ch] font-display text-[clamp(2.2rem,6vw,5rem)] leading-[0.95] tracking-tightest text-white"
          style={{ fontWeight: 740 }}
        >
          One hearth. Lit only for the person who keeps it.
        </h2>
      </>
    ),
  },
  {
    page: 1,
    align: "left",
    body: (
      <>
        <p className="label mb-5">You deposit</p>
        <h2
          className="max-w-[18ch] font-display text-[clamp(2rem,5.5vw,4.6rem)] leading-[0.98] tracking-tightest text-white"
          style={{ fontWeight: 740 }}
        >
          You fill it, and the amount seals shut.
        </h2>
        <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-white/55">
          The amount is encrypted in your browser and stays a ciphertext on chain. From here on the
          number is yours alone, and Zama&apos;s access control list is what enforces that.
        </p>
        <Ciphertext />
      </>
    ),
  },
  {
    page: 3,
    align: "right",
    body: (
      <>
        <h2
          className="ml-auto max-w-[18ch] text-right font-display text-[clamp(2rem,5.5vw,4.6rem)] leading-[0.98] tracking-tightest text-white"
          style={{ fontWeight: 740 }}
        >
          And it is one of many.
        </h2>
        <p className="ml-auto mt-4 max-w-[36ch] text-right text-[15px] leading-relaxed text-white/55">
          Every saver&apos;s balance burns and not one of them can be read from outside. The pool never
          publishes its exact total either, only the power of two it sits under, because the exact
          total would give away a lone mover&apos;s deposit.
        </p>
      </>
    ),
  },
  {
    page: 4,
    align: "left",
    body: (
      <>
        <p className="label mb-5">The draw</p>
        <h2
          className="max-w-[18ch] font-display text-[clamp(2rem,5.5vw,4.6rem)] leading-[0.98] tracking-tightest text-white"
          style={{ fontWeight: 740 }}
        >
          A seed nobody can see, drawn inside the coprocessor.
        </h2>
        <p className="mt-4 max-w-[36ch] text-[15px] leading-relaxed text-white/55">
          Prize sizes are fixed before the seed exists, so nobody can read a seed, work out that they
          won, and make the win bigger. When the period ends the seed is published with a signature
          the contract checks on chain.
        </p>
      </>
    ),
  },
  {
    page: 6,
    align: "right",
    body: (
      <>
        <p className="label mb-5 justify-end">The win</p>
        <h2
          className="ml-auto max-w-[18ch] text-right font-display text-[clamp(2rem,5.5vw,4.6rem)] leading-[0.98] tracking-tightest text-white"
          style={{ fontWeight: 740 }}
        >
          One hearth burns brighter.
        </h2>
        <p className="ml-auto mt-4 max-w-[38ch] text-right text-[15px] leading-relaxed text-white/55">
          Odds are proportional to the balance held across the whole period, so a deposit made just
          before the draw earns only the fraction of the period it was there. The prize lands in an
          encrypted winnings balance, and a claim is an ordinary withdrawal.
        </p>
      </>
    ),
  },
];

export function HearthStory({ stats }: { stats?: PoolStats | null }) {
  const reduced = useReducedMotion();

  // A reader who has asked for reduced motion gets the same words with no WebGL context, no camera
  // flight and no scroll hijack.
  if (reduced) return <StillStory stats={stats ?? null} />;

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
            {CAPTIONS.map((caption) => (
              <Caption key={caption.page} page={caption.page} align={caption.align}>
                {caption.body}
              </Caption>
            ))}
          </Scroll>
        </ScrollControls>
        <AdaptiveDpr pixelated />
        <Preload all />
      </Canvas>

      <CloseOverlay stats={stats ?? null} />
    </div>
  );
}

function StillStory({ stats }: { stats: PoolStats | null }) {
  return (
    <div className="relative w-full bg-[#050505]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 72% 42%, rgba(249,183,64,0.16), transparent 60%)," +
            "radial-gradient(50% 60% at 20% 70%, rgba(249,209,0,0.06), transparent 65%)," +
            "#050505",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-[92rem] flex-col gap-20 px-6 pb-20 pt-32 lg:gap-28 lg:px-16">
        {CAPTIONS.map((caption) => (
          <section key={caption.page} className={caption.align === "right" ? "text-right" : ""}>
            {caption.body}
          </section>
        ))}

        <section className="grid grid-cols-1 items-end gap-8 border-t border-white/10 pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
          <CloseContent stats={stats} />
        </section>
      </div>

      <StoryFooter />
    </div>
  );
}

function CloseOverlay({ stats }: { stats: PoolStats | null }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inner = useRef<HTMLDivElement | null>(null);
  const foot = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let frame = 0;
    let hidden: boolean | null = null;
    const loop = () => {
      const shown = THREE.MathUtils.clamp((closeSignal.current - 0.85) / 0.1, 0, 1);
      if (ref.current) ref.current.style.opacity = String(shown);
      const next = shown <= 0.5;
      if (next !== hidden) {
        hidden = next;
        // Opacity alone leaves the links and the demo button in the tab order while the scene is
        // still playing. inert takes the whole subtree out of it, and out of hit testing.
        if (ref.current) {
          ref.current.inert = next;
          if (next) ref.current.setAttribute("aria-hidden", "true");
          else ref.current.removeAttribute("aria-hidden");
        }
        const events = next ? "none" : "auto";
        if (inner.current) inner.current.style.pointerEvents = events;
        if (foot.current) foot.current.style.pointerEvents = events;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={ref}
      inert
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 flex items-center opacity-0"
      style={{ opacity: 0 }}
    >
      <div
        ref={inner}
        // Scrolls inside itself on a short viewport rather than sliding under the fixed header and
        // the footer, which is what a laptop at 617 pixels of height was doing.
        className="pointer-events-none mx-auto grid max-h-[100svh] w-full max-w-[92rem] grid-cols-1 items-end gap-8 overflow-y-auto px-6 pb-24 pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:px-16"
      >
        <CloseContent stats={stats} />
      </div>

      <StoryFooter footRef={foot} pinned />
    </div>
  );
}

function CloseContent({ stats }: { stats: PoolStats | null }) {
  const grand = stats?.nextPrize[0] ?? null;

  return (
    <>
      <div>
        <p className="label mb-5">Try it</p>
        <h2
          className="max-w-[15ch] font-display text-[clamp(2.2rem,7vw,6rem)] leading-[0.9] tracking-tightest text-white"
          style={{ fontWeight: 760 }}
        >
          Save in the dark.
        </h2>
        <p className="mt-5 max-w-[40ch] text-[16px] leading-relaxed text-white/60">
          Deposit test USDC on Sepolia, run a draw yourself, and check that only you can read your own
          balance. It costs nothing but a little test ETH.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-5">
          <Link
            href="/app"
            prefetch
            className="group inline-flex items-center gap-2.5 rounded-lg bg-flameFill px-6 py-3.5 text-[15px] font-medium text-onFlame transition-transform duration-200 hover:scale-[1.02]"
          >
            Open the pool
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
              &rarr;
            </span>
          </Link>
          {grand !== null && grand > 0n && (
            <span className="text-[14px] text-white/55">
              <span className="font-display tabular-nums text-flame" style={{ fontWeight: 620 }}>
                {formatAmount(grand)} USDC
              </span>{" "}
              grand prize next draw
            </span>
          )}
          {stats && (
            <span className="text-[14px] tabular-nums text-white/45">
              {stats.savers} saver{stats.savers === 1 ? "" : "s"} · period {stats.period}
            </span>
          )}
        </div>
        {stats === null && (
          <p className="mt-4 max-w-[42ch] text-[13px] leading-relaxed text-white/40">
            Sepolia is not answering right now, so the live figures are missing. The pool is
            unaffected: it lives on chain, not here.
          </p>
        )}
      </div>

      <SealedHandle handle={stats?.sealedHandle ?? null} owner={stats?.sealedOwner ?? null} />
    </>
  );
}

function StoryFooter({
  footRef,
  pinned = false,
}: {
  footRef?: React.MutableRefObject<HTMLElement | null>;
  pinned?: boolean;
}) {
  return (
    <footer
      ref={footRef}
      style={pinned ? { pointerEvents: "none" } : undefined}
      className={`border-t border-white/10 bg-black/25 px-6 py-4 backdrop-blur-sm lg:px-16 ${
        pinned ? "absolute inset-x-0 bottom-0" : "relative"
      }`}
    >
      <div className="mx-auto flex max-w-[92rem] flex-col items-center justify-between gap-3 text-[13px] sm:flex-row">
        <span className="text-white/45">Hearth, confidential no-loss prize savings</span>
        <nav className="flex flex-wrap items-center justify-center gap-5">
          <Link href="/how" prefetch className="text-white/55 transition-colors hover:text-white">
            How it works
          </Link>
          <Link href="/verify" prefetch className="text-white/55 transition-colors hover:text-white">
            Verify a draw
          </Link>
          <Link href="/docs" className="text-white/55 transition-colors hover:text-white">
            Docs
          </Link>
          <a
            href="https://docs.zama.ai/protocol"
            target="_blank"
            rel="noopener noreferrer"
            className="text-flame/80 transition-colors hover:text-flame"
          >
            Built on the Zama Protocol
          </a>
        </nav>
      </div>
    </footer>
  );
}

const HEX = "0123456789abcdef";
/** Fixed, so the reduced motion page shows a ciphertext instead of a strobing one. */
const SEALED_SAMPLE = "0x7d41f0a9c26be835";

/** The deposit amount counting up, then turning into the ciphertext handle it becomes on chain. */
function Ciphertext() {
  const node = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    let shownText: string | null = null;
    let shownSealed: boolean | null = null;

    // Written straight to the node. React re-rendering this sixty times a second was competing
    // with the scene for the same frame budget.
    const write = (text: string, sealed: boolean) => {
      const el = node.current;
      if (!el) return;
      if (text !== shownText) {
        el.textContent = text;
        shownText = text;
      }
      if (sealed !== shownSealed) {
        el.classList.toggle("text-flame/60", sealed);
        el.classList.toggle("text-flame", !sealed);
        shownSealed = sealed;
      }
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      write(SEALED_SAMPLE, true);
      return;
    }

    let frame = 0;
    let scrambledAt = 0;
    let text = "$0";
    const loop = (now: number) => {
      const progress = depositSignal.current;
      const sealed = progress >= 0.9;
      if (!sealed) {
        text = `$${Math.round((progress / 0.9) * 500).toLocaleString("en-US")}`;
      } else if (now - scrambledAt >= 90) {
        // Eleven changes a second. At sixty it reads as a flicker rather than as a value nobody
        // can pin down.
        scrambledAt = now;
        text = "0x" + Array.from({ length: 16 }, () => HEX[(Math.random() * 16) | 0]).join("");
      }
      write(text, sealed);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <p
      ref={node}
      className="mt-6 font-display text-[clamp(1.2rem,2.6vw,2rem)] tabular-nums tracking-tight text-flame transition-colors"
    >
      $0
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
      <div className={`mx-auto w-full max-w-[92rem] ${align === "right" ? "text-right" : ""}`}>{children}</div>
    </div>
  );
}
