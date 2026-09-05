"use client";

import { AdaptiveDpr, Environment, Lightformer, Preload, Scroll, ScrollControls, useScroll } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import * as THREE from "three";
import type { PoolPrize, PoolStats } from "@/lib/chain/read";
import { Link } from "@/i18n/navigation";
import { localeEntry } from "@/i18n/routing";
import { SealedHandle } from "@/components/home/SealedHandle";
import { ScrollCue } from "./ScrollCue";
import { PoolShelf } from "./PoolShelf";
import { DepositCoins, DrawSpark, FocalFlame, FlameCrowd, SealPulse, useFlameField } from "@/components/scene/flames";
import { useFormat } from "@/hooks/useFormat";

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

/**
 * The five captions, written once and laid out twice: over the scene, or stacked in a still page.
 *
 * The alignment mirrors with the language. A caption pinned to the right of an English page belongs
 * on the left of an Arabic one, because both are the far side of the reading line, and a scene the
 * camera flies through in one direction should not have its words on the wrong side of it.
 */
type CaptionSpec = { page: number; align: "start" | "end"; body: React.ReactNode };

function useCaptions(): CaptionSpec[] {
  const t = useTranslations("landing.story");
  const locale = useLocale();

  return [
    {
      page: 0,
      align: "start",
      body: (
        <>
          <p className="label mb-5">{t("one.kicker")}</p>
          <h2
            className="max-w-[16ch] font-display text-[clamp(2.2rem,6vw,5rem)] leading-[0.95] tracking-tightest text-white"
            style={{ fontWeight: 740 }}
          >
            {t("one.title")}
          </h2>
        </>
      ),
    },
    {
      page: 1,
      align: "start",
      body: (
        <>
          <p className="label mb-5">{t("two.kicker")}</p>
          <h2
            className="max-w-[18ch] font-display text-[clamp(2rem,5.5vw,4.6rem)] leading-[0.98] tracking-tightest text-white"
            style={{ fontWeight: 740 }}
          >
            {t("two.title")}
          </h2>
          <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-white/55">{t("two.body")}</p>
          <Ciphertext locale={localeEntry(locale).intl} />
        </>
      ),
    },
    {
      page: 3,
      align: "end",
      body: (
        <>
          <h2
            className="ms-auto max-w-[18ch] text-end font-display text-[clamp(2rem,5.5vw,4.6rem)] leading-[0.98] tracking-tightest text-white"
            style={{ fontWeight: 740 }}
          >
            {t("three.title")}
          </h2>
          <p className="ms-auto mt-4 max-w-[36ch] text-end text-[15px] leading-relaxed text-white/55">
            {t("three.body")}
          </p>
        </>
      ),
    },
    {
      page: 4,
      align: "start",
      body: (
        <>
          <p className="label mb-5">{t("four.kicker")}</p>
          <h2
            className="max-w-[18ch] font-display text-[clamp(2rem,5.5vw,4.6rem)] leading-[0.98] tracking-tightest text-white"
            style={{ fontWeight: 740 }}
          >
            {t("four.title")}
          </h2>
          <p className="mt-4 max-w-[36ch] text-[15px] leading-relaxed text-white/55">{t("four.body")}</p>
        </>
      ),
    },
    {
      page: 6,
      align: "end",
      body: (
        <>
          <p className="label mb-5 justify-end">{t("five.kicker")}</p>
          <h2
            className="ms-auto max-w-[18ch] text-end font-display text-[clamp(2rem,5.5vw,4.6rem)] leading-[0.98] tracking-tightest text-white"
            style={{ fontWeight: 740 }}
          >
            {t("five.title")}
          </h2>
          <p className="ms-auto mt-4 max-w-[38ch] text-end text-[15px] leading-relaxed text-white/55">
            {t("five.body")}
          </p>
        </>
      ),
    },
  ];
}

/**
 * Whether this browser can open a WebGL context at all.
 *
 * Asked once, before the canvas is built, because a machine with WebGL switched off or a driver
 * on a blocklist throws at context creation and the whole landing page goes blank. The story is
 * the same words either way, so there is a page version of it to fall back to.
 */
function canDrawWebGL(): boolean {
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * The last line of defence around the scene.
 *
 * The probe above catches a browser with no WebGL. This catches everything after that: a context
 * lost mid-build, a shader the driver refuses, a postprocessing pass that will not compile. Any
 * of those used to take the landing page down to a blank screen with the error only in the
 * console, which is the first five seconds of the whole project.
 */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function HearthStory({ stats, pools = [] }: { stats?: PoolStats | null; pools?: PoolPrize[] }) {
  const reduced = useReducedMotion();
  const captions = useCaptions();
  // This component only ever mounts in the browser: the landing page loads it with ssr off, so
  // there is no server render for the probe to disagree with.
  const [webgl] = useState(canDrawWebGL);

  // A reader who has asked for reduced motion gets the same words with no WebGL context, no camera
  // flight and no scroll hijack. So does a browser that cannot give us a context.
  if (reduced || !webgl) {
    return <StillStory stats={stats ?? null} pools={pools} captions={captions} note={!webgl} />;
  }

  return (
    <SceneBoundary fallback={<StillStory stats={stats ?? null} pools={pools} captions={captions} note />}>
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
              {captions.map((caption) => (
                <Caption key={caption.page} page={caption.page} align={caption.align}>
                  {caption.body}
                </Caption>
              ))}
            </Scroll>
          </ScrollControls>
          <AdaptiveDpr pixelated />
          <Preload all />
        </Canvas>

        <CloseOverlay stats={stats ?? null} pools={pools} />
        <ScrollCue />
      </div>
    </SceneBoundary>
  );
}

function StillStory({
  stats,
  pools,
  captions,
  note = false,
}: {
  stats: PoolStats | null;
  pools: PoolPrize[];
  captions: CaptionSpec[];
  /** True only when this is standing in for a scene that could not run, never for reduced motion. */
  note?: boolean;
}) {
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
        {note && <NoWebglNote />}

        {captions.map((caption) => (
          <section key={caption.page} className={caption.align === "end" ? "text-end" : ""}>
            {caption.body}
          </section>
        ))}

        <section className="grid grid-cols-1 items-end gap-8 border-t border-white/10 pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
          <CloseContent stats={stats} pools={pools} />
        </section>
      </div>

      <StoryFooter />
    </div>
  );
}

/** Said once, at the top of the page version, so a blank-looking landing is never a mystery. */
function NoWebglNote() {
  const t = useTranslations("landing");

  return (
    <p className="max-w-[52ch] rounded-e-lg border-s-2 border-s-flame/60 bg-flame/[0.06] px-4 py-3 text-[13px] leading-relaxed text-white/60">
      {t("noWebgl")}
    </p>
  );
}

function CloseOverlay({ stats, pools }: { stats: PoolStats | null; pools: PoolPrize[] }) {
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
        <CloseContent stats={stats} pools={pools} />
      </div>

      <StoryFooter footRef={foot} pinned />
    </div>
  );
}

function CloseContent({ stats, pools }: { stats: PoolStats | null; pools: PoolPrize[] }) {
  const t = useTranslations("landing.close");
  const format = useFormat();
  const grand = stats?.nextPrize[0] ?? null;

  return (
    <>
      <div>
        <p className="label mb-5">{t("kicker")}</p>
        <h2
          className="max-w-[15ch] font-display text-[clamp(2.2rem,7vw,6rem)] leading-[0.9] tracking-tightest text-white"
          style={{ fontWeight: 760 }}
        >
          {t("title")}
        </h2>
        <p className="mt-5 max-w-[40ch] text-[16px] leading-relaxed text-white/60">{t("body")}</p>

        <div className="mt-8 flex flex-wrap items-center gap-5">
          <Link
            href="/app"
            prefetch
            className="group inline-flex items-center gap-2.5 rounded-lg bg-flameFill px-6 py-3.5 text-[15px] font-medium text-onFlame transition-transform duration-200 hover:scale-[1.02]"
          >
            {t("open")}
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
              &rarr;
            </span>
          </Link>
          {grand !== null && grand > 0n && stats && (
            <span className="text-[14px] text-white/55">
              {t.rich("grandPrize", {
                amount: format.amount(grand, stats.decimals),
                symbol: stats.symbol,
                figure: (chunks) => (
                  <span className="font-display tabular-nums text-flame" style={{ fontWeight: 620 }}>
                    {chunks}
                  </span>
                ),
              })}
            </span>
          )}
          {stats && (
            <span className="text-[14px] tabular-nums text-white/55">
              {t("saversPeriod", {
                count: stats.savers,
                shown: format.count(stats.savers),
                period: stats.period,
              })}
            </span>
          )}
        </div>
        {stats === null && (
          <p className="mt-4 max-w-[42ch] text-[13px] leading-relaxed text-white/55">{t("offline")}</p>
        )}

        <PoolShelf pools={pools} />
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
  const t = useTranslations("landing.footer");

  return (
    <footer
      ref={footRef}
      style={pinned ? { pointerEvents: "none" } : undefined}
      className={`border-t border-white/10 bg-black/25 px-6 py-4 backdrop-blur-sm lg:px-16 ${
        pinned ? "absolute inset-x-0 bottom-0" : "relative"
      }`}
    >
      <div className="mx-auto flex max-w-[92rem] flex-col items-center justify-between gap-3 text-[13px] sm:flex-row">
        <span className="text-white/55">{t("tagline")}</span>
        <nav className="flex flex-wrap items-center justify-center gap-5">
          <Link href="/how" prefetch className="text-white/55 transition-colors hover:text-white">
            {t("how")}
          </Link>
          <Link href="/verify" prefetch className="text-white/55 transition-colors hover:text-white">
            {t("verify")}
          </Link>
          <Link href="/docs" className="text-white/55 transition-colors hover:text-white">
            {t("docs")}
          </Link>
          <a
            href="https://docs.zama.ai/protocol"
            target="_blank"
            rel="noopener noreferrer"
            className="text-flame/80 transition-colors hover:text-flame"
          >
            {t("zama")}
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
/**
 * The grouping tag arrives as a prop rather than from a hook.
 *
 * This renders inside the WebGL canvas, and react-three-fiber gives its children their own React
 * root: a context provider mounted outside the canvas is not visible to them, so any hook that
 * reads context throws here. Everything this needs is resolved by the caption above and handed
 * down as a plain string.
 */
function Ciphertext({ locale }: { locale: string }) {
  const node = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const grouping = new Intl.NumberFormat(`${locale}-u-nu-latn`, {
      maximumFractionDigits: 0,
    });

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
        text = `$${grouping.format(Math.round((progress / 0.9) * 500))}`;
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
  }, [locale]);

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
  align = "start",
}: {
  children: React.ReactNode;
  page: number;
  align?: "start" | "end";
}) {
  return (
    <div
      className="pointer-events-none absolute start-0 flex w-full items-center px-6 lg:px-16"
      style={{ top: `${page * 100}svh`, height: "100svh" }}
    >
      <div className={`mx-auto w-full max-w-[92rem] ${align === "end" ? "text-end" : ""}`}>{children}</div>
    </div>
  );
}
