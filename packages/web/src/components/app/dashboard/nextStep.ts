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

export type NextStep = {
  key: NextStepKey;
  title: string;
  detail: string;
  /** Null when there is nothing to press, which is what a read still in flight looks like. */
  cta: string | null;
  href?: string;
  /** Set when the button does something to the wallet instead of moving to another screen. */
  act?: "connect" | "switch";
  tone?: "flame" | "quiet";
};

export type NextStepInput = {
  connected: boolean;
  wrongNetwork: boolean;
  /**
   * False while the saver batch is in flight or came back empty. Every field below it falls back
   * to zero inside the hook, so a step chosen without this would send a funded wallet to the
   * faucet and a depositor back to the start.
   */
  positionKnown: boolean;
  usdc: bigint;
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
  if (!state.connected) {
    return {
      key: "connect",
      title: "Connect a wallet to begin.",
      detail:
        "Hearth runs on Ethereum Sepolia. You need a little test ETH for gas, and the test USDC is one click away once a wallet is connected.",
      cta: "Connect wallet",
      act: "connect",
    };
  }

  if (state.wrongNetwork) {
    return {
      key: "switch",
      title: "This wallet is pointed at another network.",
      detail:
        "The pool figures on this page are read from Sepolia either way. Nothing can be signed or sent until the wallet is on it too.",
      cta: "Switch to Sepolia",
      act: "switch",
    };
  }

  if (!state.positionKnown) {
    return {
      key: "reading",
      title: "Reading this wallet from the chain.",
      detail:
        "The next step appears once the reads land. Naming one from a balance that has not arrived would point you at the wrong screen.",
      cta: null,
    };
  }

  if (!state.isSaver && !state.hasConfidential && state.usdc === 0n) {
    return {
      key: "faucet",
      title: "Get some test USDC.",
      detail:
        "Zama's mock USDC has an open mint capped at a million tokens a call. It is worth nothing, so take more than you need.",
      cta: "Get test USDC",
      href: "/app/deposit",
    };
  }

  if (!state.hasConfidential) {
    return {
      key: "shield",
      title: "Shield your USDC.",
      detail:
        "Shielding turns plain USDC into the confidential kind. That step is public by nature, and it is the last thing about this money anyone can read.",
      cta: "Shield USDC",
      href: "/app/deposit",
    };
  }

  if (!state.isSaver) {
    return {
      key: "deposit",
      title: "Put your confidential USDC into the pool.",
      detail:
        "The amount is encrypted in your browser before it is sent, so the vault credits a number it cannot read. Your odds follow what you hold.",
      cta: "Deposit",
      href: "/app/deposit",
    };
  }

  if (state.winnings !== null && state.winnings > 0n) {
    return {
      key: "claim",
      title: "You have winnings waiting.",
      detail:
        "Claiming is an ordinary withdrawal for that amount. On chain it has the same shape as any other withdrawal, which is what stops it naming the winner.",
      cta: "Claim your winnings",
      href: "/app/withdraw",
    };
  }

  if (!state.drawsKnown) {
    return {
      key: "reading",
      title: "Reading the recent draws.",
      detail:
        "The next step appears once they land. Naming one from a draw list that has not arrived would point you at the wrong screen.",
      cta: null,
    };
  }

  if (state.resultDrawId !== null) {
    return {
      key: "result",
      title: `Draw ${state.resultDrawId} has your result written.`,
      detail:
        "The walk reached this wallet, so whether it won is already decided and stored. It stays sealed until you open it, which costs a signature and no gas.",
      cta: `Open draw ${state.resultDrawId}`,
      href: "/app/draws",
    };
  }

  return {
    key: "settled",
    title: "Nothing needs doing right now.",
    detail:
      "Your deposit sits in the pool and earns odds for every second it stays there. The next draw closes at the end of the period, and anyone can close it.",
    cta: "Add to your deposit",
    href: "/app/deposit",
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
