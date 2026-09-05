import type { DrawView } from "@/hooks/useHearth";

export type NextStepKey =
  | "connect"
  | "switch"
  | "reading"
  | "faucet"
  | "shield"
  | "deposit"
  | "claim"
  | "result"
  | "settled";

/**
 * The one thing to do next, named rather than written out.
 *
 * `title`, `detail` and `cta` are keys in the `nextStep` namespace and `values` is what they take.
 * The card that shows the step is the piece that knows the language, which is also why the choice
 * itself stays a pure function of what the chain said and can be reasoned about on its own.
 */
export type NextStep = {
  key: NextStepKey;
  title: string;
  detail: string;
  /** Null when there is nothing to press, which is what a read still in flight looks like. */
  cta: string | null;
  values?: Record<string, string | number>;
  href?: string;
  /** Set when the button does something to the wallet instead of moving to another screen. */
  act?: "connect" | "switch";
  tone?: "flame" | "quiet";
};

export type NextStepInput = {
  connected: boolean;
  wrongNetwork: boolean;
  /** The confidential token and the plain one under it, so every sentence names the right money. */
  symbol: string;
  underlyingSymbol: string;
  /** Where this pool's screens live, as in /app/usdc. Every link a step offers hangs off it. */
  base: string;
  /**
   * False while the saver batch is in flight or came back empty. Every field below it falls back
   * to zero inside the hook, so a step chosen without this would send a funded wallet to the
   * faucet and a depositor back to the start.
   */
  positionKnown: boolean;
  underlyingBalance: bigint;
  /** This address has wrapped at some point. The amount it holds is encrypted and not knowable. */
  hasConfidential: boolean;
  isSaver: boolean;
  /** The decrypted winnings, and null unless this browser opened them in this session. */
  winnings: bigint | null;
  /** False until the draw list can be trusted, for the same reason as positionKnown. */
  drawsKnown: boolean;
  /** The newest awarded draw whose walk has already written this wallet's result. */
  resultDrawId: number | null;
};

/**
 * The one thing to do next, picked from what the chain actually says.
 *
 * The order is the order a saver meets these problems in, and the two "known" gates come before
 * anything that reads a balance. A screen that tells you to mint test money because a multicall
 * has not answered yet is worse than a screen that says it is still reading.
 *
 * Winnings are the exception to reading state: they only exist here when their owner chose to
 * decrypt them on this page, so an unopened position never produces a claim.
 */
export function chooseNextStep(state: NextStepInput): NextStep {
  const tokens = { symbol: state.symbol, underlyingSymbol: state.underlyingSymbol };

  if (!state.connected) {
    return {
      key: "connect",
      title: "connectTitle",
      detail: "connectDetail",
      cta: "connectCta",
      values: tokens,
      act: "connect",
    };
  }

  if (state.wrongNetwork) {
    return {
      key: "switch",
      title: "switchTitle",
      detail: "switchDetail",
      cta: "switchCta",
      act: "switch",
    };
  }

  if (!state.positionKnown) {
    return { key: "reading", title: "readingTitle", detail: "readingDetail", cta: null };
  }

  if (!state.isSaver && !state.hasConfidential && state.underlyingBalance === 0n) {
    return {
      key: "faucet",
      title: "faucetTitle",
      detail: "faucetDetail",
      cta: "faucetCta",
      values: tokens,
      href: `${state.base}/deposit`,
    };
  }

  if (!state.hasConfidential) {
    return {
      key: "shield",
      title: "shieldTitle",
      detail: "shieldDetail",
      cta: "shieldCta",
      values: tokens,
      href: `${state.base}/deposit`,
    };
  }

  if (!state.isSaver) {
    return {
      key: "deposit",
      title: "depositTitle",
      detail: "depositDetail",
      cta: "depositCta",
      values: tokens,
      href: `${state.base}/deposit`,
    };
  }

  if (state.winnings !== null && state.winnings > 0n) {
    return {
      key: "claim",
      title: "claimTitle",
      detail: "claimDetail",
      cta: "claimCta",
      href: `${state.base}/withdraw`,
    };
  }

  if (!state.drawsKnown) {
    return { key: "reading", title: "readingDrawsTitle", detail: "readingDrawsDetail", cta: null };
  }

  if (state.resultDrawId !== null) {
    return {
      key: "result",
      title: "resultTitle",
      detail: "resultDetail",
      cta: "resultCta",
      values: { drawId: state.resultDrawId },
      href: `${state.base}/draws`,
    };
  }

  return {
    key: "settled",
    title: "settledTitle",
    detail: "settledDetail",
    cta: "settledCta",
    href: `${state.base}/deposit`,
    tone: "quiet",
  };
}

/**
 * The newest draw that has written this wallet into it.
 *
 * A draw whose own read has not landed is skipped rather than treated as unevaluated, because the
 * fallback for both is the same false and only one of them is a fact.
 */
export function latestWrittenResult(draws: DrawView[]): number | null {
  const found = draws.find((draw) => draw.known && draw.status === "awarded" && draw.mine?.evaluated === true);
  return found ? found.drawId : null;
}
