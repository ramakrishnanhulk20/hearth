"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect } from "react";
import { Providers } from "./Providers";
import { ConnectBar, useReady } from "./ConnectBar";
import { LanguagePicker } from "@/components/LanguagePicker";
import { useLantern } from "@/hooks/useLantern";
import { LanternConsole, PrizeBanner } from "./LanternConsole";
import { sceneSignals as S } from "./sceneState";

const AppScene = dynamic(() => import("./AppScene"), { ssr: false });

export function AppScreen() {
  return (
    <Providers>
      <Shell />
    </Providers>
  );
}

function SceneDriver() {
  const ready = useReady();
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let ignite = ready ? 0 : 999;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ignite += dt;
      const k = 1 - Math.pow(0.05, dt);
      const target = ready ? (ignite < 0.45 ? 1.6 : 1) : 0.05;
      S.brightness.current += (target - S.brightness.current) * k;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ready]);
  return null;
}

function Shell() {
  const reads = useLantern();

  return (
    <div className="force-dark relative min-h-[100svh] overflow-hidden">
      <AppScene />
      <SceneDriver />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-6 lg:px-10">
        <a href="/" className="pointer-events-auto group flex items-center gap-3" aria-label="Lantern, home">
          <span className="relative block h-[18px] w-[13px]">
            <span className="absolute inset-x-0 bottom-0 top-[3px] rounded-[3px] border border-flame/70 bg-flame/15 transition-colors duration-300 group-hover:bg-flame/30" />
            <span className="absolute left-1/2 top-0 h-[5px] w-[7px] -translate-x-1/2 rounded-t-full border border-b-0 border-flame/70" />
          </span>
          <span className="font-display text-[18px] tracking-[-0.02em] text-parchment" style={{ fontWeight: 680 }}>
            Lantern
          </span>
        </a>
        <div className="pointer-events-auto flex items-center gap-3">
          <Link
            href="/how"
            prefetch
            className="hidden text-[13px] text-faint transition-colors hover:text-parchment sm:block"
          >
            How it works
          </Link>
          <ConnectBar />
          <LanguagePicker />
        </div>
      </header>

      <PrizeBanner reads={reads} />
      <LanternConsole reads={reads} />
    </div>
  );
}
