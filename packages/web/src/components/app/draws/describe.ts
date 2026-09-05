import type { DrawView, SaverState } from "@/hooks/useHearth";

/**
 * What a draw's status means, named rather than written out. `badge` and `line` are keys in the
 * `describe` namespace, so the card that draws them says them in the reader's language and this
 * file stays a pure function of what the chain returned.
 */
export type DrawSummary = {
  badge: string;
  tone: "quiet" | "flame" | "good" | "bad";
  line: string;
  /** True when what this draw is waiting for is a step on Run a draw, not anything on this page. */
  waitingOnRun: boolean;
};

/**
 * The unread case comes first because every field under `known` is a fallback until the pool's
 * drawOf read lands, and a zero close deadline would otherwise print as "missed", which is a
 * statement about the chain that we cannot make.
 */
export function describe(draw: DrawView, saver: SaverState, now: number): DrawSummary {
  if (!draw.known) {
    return { badge: "unreadBadge", tone: "quiet", line: "unread", waitingOnRun: false };
  }

  if (draw.status === "none") {
    if (now < draw.closeDeadline) {
      return { badge: "notClosedBadge", tone: "quiet", line: "notClosed", waitingOnRun: true };
    }
    return { badge: "missedBadge", tone: "bad", line: "missed", waitingOnRun: false };
  }

  if (draw.status === "closed") {
    return { badge: "closedBadge", tone: "flame", line: "closed", waitingOnRun: true };
  }

  if (draw.status === "empty") {
    return { badge: "emptyBadge", tone: "quiet", line: "empty", waitingOnRun: false };
  }

  if (draw.status === "skipped") {
    return { badge: "skippedBadge", tone: "quiet", line: "skipped", waitingOnRun: false };
  }

  const evaluatedAll = draw.walkCount > 0 && draw.cursor >= draw.walkCount;

  if (!saver.connected) {
    return {
      badge: "awardedBadge",
      tone: "good",
      line: evaluatedAll ? "awardedAllDisconnected" : "awardedDisconnected",
      waitingOnRun: false,
    };
  }

  if (!saver.isSaver) {
    return {
      badge: "awardedBadge",
      tone: "good",
      line: evaluatedAll ? "awardedAllOutside" : "awardedOutside",
      waitingOnRun: false,
    };
  }

  return {
    badge: "awardedBadge",
    tone: "good",
    line: evaluatedAll ? "awardedAll" : "awarded",
    waitingOnRun: false,
  };
}
