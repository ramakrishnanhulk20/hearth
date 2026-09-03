"use client";

import { useEffect, useRef } from "react";
import type { Phase } from "./useActions";
import { sceneSignals as S } from "@/components/scene/signals";

type Kind = "deposit" | "withdraw" | "claim" | "mint" | "draw" | "flare" | "none";

function kindOf(label: string): Kind {
  if (label === "Deposit") return "deposit";
  if (label === "Withdraw" || label === "Withdraw everything") return "withdraw";
  if (label === "Get test USDC") return "mint";
  if (label.startsWith("Close draw") || label.startsWith("Award draw") || label.startsWith("Advance draw")) return "draw";
  if (label === "") return "none";
  return "flare";
}

const ease = (current: number, target: number, rate: number) => current + (target - current) * rate;

/** Opens the hearth's glass while the saver is looking inside their own balance. */
export function usePeekScene(active: boolean) {
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      const rate = 1 - Math.pow(0.04, delta);
      S.peek.current += ((active ? 1 : 0) - S.peek.current) * rate;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [active]);
}

/**
 * Turns the phase of whatever the saver is doing into the scene's signals.
 *
 * It runs on requestAnimationFrame and writes to plain objects, so a sixty-times-a-second
 * animation never re-renders React. A settle window after "done" lets the coins land and the seal
 * close before everything returns to rest.
 */
export function useActionScene(phase: Phase, label: string) {
  const flags = useRef({ kind: "none" as Kind, active: false, done: false });
  const kind = kindOf(label);
  const active =
    phase.kind === "encrypting" ||
    phase.kind === "signing" ||
    phase.kind === "mining" ||
    phase.kind === "decrypting";
  const done = phase.kind === "done";

  // The animation loop reads this a frame later rather than on this render, so the write belongs
  // after the commit. Keeping it in a ref is what stops the loop restarting on every phase change.
  useEffect(() => {
    flags.current = { kind, active, done };
  }, [kind, active, done]);

  const engaged = phase.kind !== "idle";

  useEffect(() => {
    if (!engaged) return;

    const SETTLE = 2.8;
    let frame = 0;
    let last = performance.now();
    let deposit = S.deposit.current;
    let withdraw = S.withdraw.current;
    let boost = S.boost.current;
    let burst = S.burst.current;
    let mint = S.mint.current;
    let draw = S.draw.current;
    let winGlow = S.winGlow.current;
    let mintCycle = 0;
    let doneFor = 0;
    let sealed = false;
    let resting = false;

    const rest = () => {
      S.deposit.current = 0;
      S.withdraw.current = 0;
      S.boost.current = 0;
      S.burst.current = 0;
      S.mint.current = 0;
      S.draw.current = 0;
      S.winGlow.current = 0;
      deposit = withdraw = boost = burst = mint = draw = winGlow = 0;
    };

    const loop = (now: number) => {
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      const state = flags.current;

      if (state.active) {
        doneFor = 0;
        sealed = false;
        resting = false;
      } else if (state.done) {
        doneFor += delta;
      }

      if (!state.active && !(state.done && doneFor < SETTLE)) {
        if (!resting) {
          rest();
          resting = true;
        }
        frame = requestAnimationFrame(loop);
        return;
      }
      resting = false;

      const fast = 1 - Math.pow(0.02, delta);
      const medium = 1 - Math.pow(0.12, delta);
      const slow = 1 - Math.pow(0.4, delta);
      const kind = state.kind;
      let boostTarget = 0;

      if (kind === "deposit") {
        let target = 0;
        if (state.active) {
          target = 0.7;
          boostTarget = 0.55;
        } else if (state.done && !sealed && doneFor < 0.7) {
          target = 1;
          boostTarget = 0.4;
        }
        deposit = ease(deposit, target, medium);
        if (state.done && !sealed && deposit > 0.98) {
          deposit = 0;
          sealed = true;
        }
      } else if (kind === "withdraw") {
        let target = 0;
        if (state.active) {
          target = 0.85;
          boostTarget = 0.18;
        } else if (state.done && !sealed && doneFor < 0.7) {
          target = 1;
        }
        withdraw = ease(withdraw, target, medium);
        if (state.done && !sealed && withdraw > 0.98) {
          withdraw = 0;
          sealed = true;
        }
      } else if (kind === "mint") {
        if (state.active) {
          mintCycle += delta * 0.55;
          mint = mintCycle % 1;
          boostTarget = 0.22;
        } else {
          mint = ease(mint, 0, medium);
        }
      } else if (kind === "draw") {
        if (state.active) {
          draw = ease(draw, 1, slow);
          winGlow = ease(winGlow, draw > 0.9 ? 1 : 0, medium);
        } else if (state.done) {
          draw = ease(draw, doneFor > 2.6 ? 0 : 1, slow);
          winGlow = ease(winGlow, doneFor < 1.8 ? 1 : 0, medium);
        }
      } else {
        boostTarget = state.active ? 0.45 : 0;
      }

      if (kind !== "deposit") deposit = ease(deposit, 0, medium);
      if (kind !== "withdraw") withdraw = ease(withdraw, 0, medium);
      if (kind !== "mint") mint = ease(mint, 0, medium);
      if (kind !== "draw") {
        draw = ease(draw, 0, slow);
        winGlow = ease(winGlow, 0, medium);
      }
      burst = ease(burst, 0, medium);
      boost = ease(boost, boostTarget, fast);

      S.deposit.current = deposit;
      S.withdraw.current = withdraw;
      S.boost.current = boost;
      S.burst.current = burst;
      S.mint.current = mint;
      S.draw.current = draw;
      S.winGlow.current = winGlow;

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      rest();
    };
  }, [engaged]);
}
