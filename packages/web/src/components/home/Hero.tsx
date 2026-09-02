"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { PoolStats } from "@/lib/chain/pool";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguagePicker } from "@/components/LanguagePicker";
import { useMessages } from "@/i18n/LocaleProvider";
import { SealedHandle } from "./SealedHandle";

const GlassLanternCanvas = dynamic(() => import("./GlassLantern").then((m) => m.GlassLanternCanvas), {
  ssr: false,
});

export function Hero({ stats }: { stats: PoolStats | null }) {
  const m = useMessages();
  const lines = useDecrypting(m.hero.headline);
  const [lit, setLit] = useState(false);
  const webgl = useWebGL();

  return (
    <section className="force-dark relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink">
      <div
        className={`pointer-events-none absolute right-0 top-[-7%] z-0 h-[82%] w-full transition-opacity duration-[1400ms] ease-out lg:w-[47%] ${
          lit ? "opacity-100" : "opacity-0"
        }`}
      >
        {webgl && <GlassLanternCanvas onReady={() => setLit(true)} />}
      </div>

      {webgl === false && <FlatLantern />}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 animate-[warm_2.6s_ease-out_both] bg-[radial-gradient(46%_42%_at_74%_34%,rgba(249,209,0,0.16),transparent_68%)]"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(100deg,#000_10%,rgba(0,0,0,0.72)_38%,rgba(0,0,0,0.18)_66%,transparent_86%)]"
      />
      <Grain />

      <header className="relative z-20 mx-auto flex w-full max-w-[92rem] items-center justify-between px-6 py-7 lg:px-10">
        <Wordmark />
        <nav className="flex items-center gap-6">
          <a
            href="#how"
            className="hidden text-sm text-muted transition-colors duration-200 hover:text-parchment sm:block"
          >
            {m.nav.how}
          </a>
          <a
            href="#privacy"
            className="hidden text-sm text-muted transition-colors duration-200 hover:text-parchment sm:block"
          >
            {m.nav.hidden}
          </a>
          <a
            href="/app"
            className="rounded-lg bg-flameFill px-4 py-2 text-sm font-medium text-onFlame transition-transform duration-200 hover:scale-[1.03]"
          >
            {m.nav.openApp}
          </a>
          <LanguagePicker />
          <ThemeToggle />
        </nav>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-[92rem] flex-1 flex-col justify-end px-6 pb-14 pt-10 lg:px-10">
        <p className="label mb-7 animate-[fade_0.9s_ease-out_0.15s_both]">{m.hero.eyebrow}</p>

        <h1
          aria-label={m.hero.headline.join(" ")}
          className="font-display text-[clamp(2.6rem,8.4vw,7.6rem)] font-bold leading-[0.86] tracking-tightest text-white [font-variant-numeric:tabular-nums]"
          style={{ fontWeight: 760 }}
        >
          {lines.map((line, i) => (
            <span
              key={i}
              aria-hidden
              className={`block whitespace-pre ${
                i === 2 ? "text-flame drop-shadow-[0_0_44px_rgba(249,209,0,0.30)]" : ""
              }`}
            >
              {line}
            </span>
          ))}
        </h1>

        <div className="mt-11 grid grid-cols-1 items-end gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <div className="animate-[fade_1s_ease-out_1.5s_both]">
            <p className="max-w-[44ch] text-[16.5px] leading-relaxed text-muted">{m.hero.sub}</p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="/app"
                className="group inline-flex items-center gap-2.5 rounded-lg bg-flameFill px-6 py-3.5 text-[15px] font-medium text-onFlame transition-transform duration-200 hover:scale-[1.02]"
              >
                {m.hero.ctaDeposit}
                <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
                  &rarr;
                </span>
              </a>
              <a
                href="#how"
                className="rounded-lg border border-hairline px-6 py-3.5 text-[15px] text-parchment transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.03]"
              >
                {m.hero.ctaHow}
              </a>
            </div>
          </div>

          <div className="animate-[fade_1s_ease-out_1.7s_both]">
            <SealedHandle handle={stats?.sealedHandle ?? null} owner={stats?.sealedOwner ?? null} />
          </div>
        </div>
      </div>

      <LiveStrip stats={stats} />

      <style jsx global>{`
        @keyframes fade {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes warm {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </section>
  );
}

function LiveStrip({ stats }: { stats: PoolStats | null }) {
  const m = useMessages();
  return (
    <div className="relative z-20 border-t border-hairline bg-surface animate-[fade_1s_ease-out_1.9s_both]">
      <div className="mx-auto grid w-full max-w-[92rem] grid-cols-2 gap-px overflow-hidden px-6 lg:grid-cols-4 lg:px-10">
        {stats ? (
          <>
            <Stat label={m.hero.liveJackpot} value={`${stats.jackpot.toLocaleString()}`} unit="USDC" accent />
            <Stat label={m.hero.liveDepositors} value={stats.depositors.toLocaleString()} unit={m.hero.liveWallets} />
            <Stat label={m.hero.liveDraws} value={stats.draws.toLocaleString()} unit={m.hero.liveOnchain} />
            <NextDraw at={stats.nextDrawAt} />
          </>
        ) : (
          <div className="col-span-full py-6">
            <p className="text-[13px] text-faint">{m.hero.liveUnavailable}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  accent = false,
}: {
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div className="py-6 pr-6">
      <p className="text-[11px] uppercase tracking-label text-faint">{label}</p>
      <p className="mt-2 flex items-baseline gap-2">
        <span
          className={`font-display text-[28px] leading-none tabular-nums tracking-tight ${
            accent ? "text-flame" : "text-white"
          }`}
          style={{ fontWeight: 620 }}
        >
          {value}
        </span>
        <span className="text-[12px] text-faint">{unit}</span>
      </p>
    </div>
  );
}

function NextDraw({ at }: { at: number }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const tick = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(tick);
  }, []);

  const m = useMessages();
  const left = Math.max(0, at - now);
  const value =
    left === 0
      ? m.hero.liveReady
      : left < 3600
        ? `${Math.floor(left / 60)}m ${String(left % 60).padStart(2, "0")}s`
        : `${Math.floor(left / 3600)}h ${Math.floor((left % 3600) / 60)}m`;

  return (
    <Stat
      label={m.hero.liveNextDraw}
      value={value}
      unit={left === 0 ? m.hero.liveOpenNow : m.hero.liveFromNow}
    />
  );
}

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&$@";

function useDecrypting(source: readonly string[]) {
  const [lines, setLines] = useState<string[]>(() => [...source]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const total = source.reduce((sum, line) => sum + line.length, 0);

    const startAt = 320;
    const runFor = 1250;

    let frame = 0;
    const began = performance.now();
    setLines(source.map((line) => mask(line, 0)));

    function step(now: number) {
      const t = (now - began - startAt) / runFor;
      if (t >= 1) {
        setLines([...source]);
        return;
      }

      const eased = t <= 0 ? 0 : 1 - Math.pow(1 - t, 2.1);
      let budget = eased * total;
      setLines(
        source.map((line) => {
          const revealed = Math.max(0, Math.min(line.length, Math.round(budget)));
          budget -= line.length;
          return mask(line, revealed);
        }),
      );
      frame = requestAnimationFrame(step);
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [source]);

  return lines;
}

function mask(line: string, revealed: number) {
  let out = "";
  for (let i = 0; i < line.length; i++) {
    const character = line[i];
    if (i < revealed || character === " " || character === ".") out += character;
    else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
  }
  return out;
}

function useWebGL() {
  const [supported, setSupported] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      setSupported(Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")));
    } catch {
      setSupported(false);
    }
  }, []);

  return supported;
}

function FlatLantern() {
  return (
    <div aria-hidden className="pointer-events-none absolute right-[6%] top-[-7%] z-0 h-[82%] w-[38%] lg:w-[26%]">
      <div className="absolute left-1/2 top-0 h-[30%] w-px -translate-x-1/2 bg-white/10" />
      <div className="absolute inset-x-[18%] top-[30%] h-[38%] rounded-[14%] border border-flame/25 bg-[linear-gradient(160deg,rgba(249,209,0,0.14),rgba(255,255,255,0.04)_55%,rgba(249,209,0,0.09))] shadow-flame" />
      <div className="absolute inset-x-[30%] top-[40%] h-[20%] rounded-full bg-[radial-gradient(circle,rgba(255,216,77,0.65),transparent_70%)] blur-2xl" />
      <div className="absolute inset-x-[-30%] top-[74%] h-[26%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(249,163,0,0.28),transparent)] blur-2xl" />
    </div>
  );
}

function Wordmark() {
  return (
    <a href="/" className="group flex items-center gap-3" aria-label="Lantern, home">
      <span className="relative block h-[18px] w-[13px]">
        <span className="absolute inset-x-0 bottom-0 top-[3px] rounded-[3px] border border-flame/70 bg-flame/15 transition-colors duration-300 group-hover:bg-flame/30" />
        <span className="absolute left-1/2 top-0 h-[5px] w-[7px] -translate-x-1/2 rounded-t-full border border-b-0 border-flame/70" />
      </span>
      <span className="font-display text-[19px] tracking-[-0.02em] text-white" style={{ fontWeight: 680 }}>
        Lantern
      </span>
    </a>
  );
}

function Grain() {
  const noise =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>
         <filter id='n'>
           <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/>
           <feColorMatrix type='saturate' values='0'/>
         </filter>
         <rect width='140' height='140' filter='url(#n)'/>
       </svg>`,
    );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] opacity-[0.05]"
      style={{ backgroundImage: `url("${noise}")`, backgroundSize: "140px 140px" }}
    />
  );
}
