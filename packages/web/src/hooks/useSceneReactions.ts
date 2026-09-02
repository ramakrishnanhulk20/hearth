"use client";

import { useEffect, useRef } from "react";
import type { Phase } from "./useActions";
import type { Messages } from "@/i18n";
import { sceneSignals as S } from "@/components/app/sceneState";

type Kind = "deposit" | "withdraw" | "claim" | "mint" | "draw" | "flare" | "none";

function ease(current: number, target: number, rate: number) {
  return current + (target - current) * rate;
}

export function usePeekScene(active: boolean) {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = 1 - Math.pow(0.04, dt);
      S.peek.current += ((active ? 1 : 0) - S.peek.current) * k;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

export function useActionScene(phase: Phase, label: string, m: Messages, channel: "you" | "pool") {
  const kind: Kind =
    label === m.phase.depositing
      ? "deposit"
      : label === m.phase.withdrawing
        ? "withdraw"
        : label === m.phase.claiming
          ? "claim"
          : label === m.phase.getTokens
            ? "mint"
            : label === m.phase.runningDraw
              ? "draw"
              : label
                ? "flare"
                : "none";

  const flags = useRef({ kind, active: false, done: false });
  flags.current = {
    kind,
    active: phase.kind === "encrypting" || phase.kind === "signing" || phase.kind === "mining",
    done: phase.kind === "done",
  };

  const engaged = phase.kind !== "idle";

  useEffect(() => {
    if (!engaged) return;

    const SETTLE = channel === "you" ? 2.8 : 3.2;

    let raf = 0;
    let last = performance.now();
    let dep = S.deposit.current;
    let wd = S.withdraw.current;
    let bo = S.boost.current;
    let bu = S.burst.current;
    let mi = S.mint.current;
    let dr = S.draw.current;
    let wg = S.winGlow.current;
    let mintCycle = 0;
    let doneElapsed = 0;
    let sealed = false;
    let resting = false;

    const rest = () => {
      if (channel === "you") {
        S.deposit.current = 0;
        S.withdraw.current = 0;
        S.boost.current = 0;
        S.burst.current = 0;
        S.mint.current = 0;
      } else {
        S.draw.current = 0;
        S.winGlow.current = 0;
      }
      dep = wd = bo = bu = mi = dr = wg = 0;
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const f = flags.current;

      if (f.active) {
        doneElapsed = 0;
        sealed = false;
        resting = false;
      } else if (f.done) {
        doneElapsed += dt;
      }

      if (!f.active && !(f.done && doneElapsed < SETTLE)) {
        if (!resting) {
          rest();
          resting = true;
        }
        raf = requestAnimationFrame(loop);
        return;
      }
      resting = false;

      const kFast = 1 - Math.pow(0.02, dt);
      const kMed = 1 - Math.pow(0.12, dt);
      const kSlow = 1 - Math.pow(0.4, dt);

      if (channel === "you") {
        const k = f.kind;
        let boT = 0;

        if (k === "deposit") {
          let depT = 0;
          if (f.active) {
            depT = 0.7;
            boT = 0.55;
          } else if (f.done && !sealed && doneElapsed < 0.7) {
            depT = 1;
            boT = 0.4;
          }
          dep = ease(dep, depT, kMed);
          if (f.done && !sealed && dep > 0.98) {
            dep = 0;
            sealed = true;
          }
        } else if (k === "withdraw") {
          let wdT = 0;
          if (f.active) {
            wdT = 0.85;
            boT = 0.18;
          } else if (f.done && !sealed && doneElapsed < 0.7) {
            wdT = 1;
          }
          wd = ease(wd, wdT, kMed);
          if (f.done && !sealed && wd > 0.98) {
            wd = 0;
            sealed = true;
          }
        } else if (k === "claim") {

          let buT = 0;
          if (f.active) {
            buT = 0.15;
            boT = 0.4;
          } else if (f.done && !sealed && doneElapsed < 0.9) {
            buT = 1;
            boT = 0.6;
          }
          bu = ease(bu, buT, kMed);
          if (f.done && !sealed && bu > 0.97) {
            bu = 0;
            sealed = true;
          }
        } else if (k === "mint") {

          if (f.active) {
            mintCycle += dt * 0.55;
            mi = mintCycle % 1;
            boT = 0.22;
          } else {
            mi = ease(mi, 0, kMed);
          }
        } else {

          boT = f.active ? 0.45 : 0;
        }

        if (k !== "deposit") dep = ease(dep, 0, kMed);
        if (k !== "withdraw") wd = ease(wd, 0, kMed);
        if (k !== "claim") bu = ease(bu, 0, kMed);
        if (k !== "mint") mi = ease(mi, 0, kMed);
        bo = ease(bo, boT, kFast);

        S.deposit.current = dep;
        S.withdraw.current = wd;
        S.boost.current = bo;
        S.burst.current = bu;
        S.mint.current = mi;
      } else {

        let drT = 0;
        let wgT = 0;
        if (f.kind === "draw") {
          if (f.active) {
            drT = 1;
            wgT = dr > 0.9 ? 1 : 0;
          } else if (f.done) {
            drT = doneElapsed > 2.6 ? 0 : 1;
            wgT = doneElapsed < 1.8 ? 1 : 0;
          }
        }
        dr = ease(dr, drT, kSlow);
        wg = ease(wg, wgT, kMed);
        S.draw.current = dr;
        S.winGlow.current = wg;
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      rest();
    };
  }, [engaged, channel]);
}
