import type { DrawView, SaverState } from "@/hooks/useHearth";

export type DrawSummary = {
  badge: string;
  tone: "quiet" | "flame" | "good" | "bad";
  line: string;
  /** True when what this draw is waiting for is a step on Run a draw, not anything on this page. */
  waitingOnRun: boolean;
};

/**
 * What a draw's status means, in the words a saver needs rather than the enum the pool stores.
 *
 * The unread case comes first because every field under `known` is a fallback until the pool's
 * drawOf read lands, and a zero close deadline would otherwise print as "missed", which is a
 * statement about the chain that we cannot make.
 */
export function describe(draw: DrawView, saver: SaverState, now: number): DrawSummary {
  if (!draw.known) {
    return {
      badge: "unread",
      tone: "quiet",
      line: "This draw has not come back from the chain yet, so nothing below it is a fact. The page keeps asking.",
      waitingOnRun: false,
    };
  }

  if (draw.status === "none") {
    if (now < draw.closeDeadline) {
      return {
        badge: "not closed",
        tone: "quiet",
        line: "The period is over and this draw is waiting to be closed. Anyone can close it, including you.",
        waitingOnRun: true,
      };
    }
    return {
      badge: "missed",
      tone: "bad",
      line: "Nobody closed this draw before its deadline, so it pays nothing. Its liquidity was never moved and the next close offers it again.",
      waitingOnRun: false,
    };
  }

  if (draw.status === "closed") {
    return {
      badge: "awaiting the proof",
      tone: "flame",
      line: "Closed. The seed, the bracket, the non-empty flag and the harvest are published and waiting for Zama's key management service to sign their cleartexts. Anyone can fetch them and award the draw.",
      waitingOnRun: true,
    };
  }

  if (draw.status === "empty") {
    return {
      badge: "empty",
      tone: "quiet",
      line: "Nobody held a balance during this period, so there was nothing to weigh. The offered liquidity went straight back to the tiers.",
      waitingOnRun: false,
    };
  }

  if (draw.status === "skipped") {
    return {
      badge: "skipped",
      tone: "quiet",
      line: "The award landed after the draw's window, so no prize was paid. The liquidity went back to the tiers and the harvest was still booked.",
      waitingOnRun: false,
    };
  }

  const evaluatedAll = draw.walkCount > 0 && draw.cursor >= draw.walkCount;

  if (!saver.connected) {
    return {
      badge: "awarded",
      tone: "good",
      line: evaluatedAll
        ? "Awarded, and the walk has reached every saver in it. Connect a wallet to see where you stood in it."
        : "Awarded. The evaluation walk is still running. Connect a wallet to see where you stand in it.",
      waitingOnRun: false,
    };
  }

  if (!saver.isSaver) {
    return {
      badge: "awarded",
      tone: "good",
      line: evaluatedAll
        ? "Awarded and every saver evaluated. This wallet was not in the pool at the time."
        : "Awarded. The evaluation walk is still running, and this wallet is not in it.",
      waitingOnRun: false,
    };
  }

  return {
    badge: "awarded",
    tone: "good",
    line: evaluatedAll
      ? "Awarded, and the walk has reached every saver in it. Every result is fixed and written."
      : "Awarded. From this moment every result is already decided: the thresholds are public and the weights can no longer change. Evaluation only writes them down.",
    waitingOnRun: false,
  };
}
