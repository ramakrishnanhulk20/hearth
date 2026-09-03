"use client";

import { Panel, Button, Pill, SealedBars, Spinner } from "@/components/ui";
import { EVALUATE_BATCH, TIER_NAMES } from "@/lib/chain/addresses";
import { countdown, formatAmount, formatUtc } from "@/lib/format";
import type { useActions } from "@/hooks/useActions";
import { drawScope, type Reveal } from "@/hooks/useReveal";
import type { DrawView, HearthConfig, SaverState } from "@/hooks/useHearth";

/**
 * One card per recent draw, saying where the draw is and where this wallet is inside it.
 *
 * Advancing the walk is not a claim. Evaluation starts at a point the draw's own seed decides and
 * runs the saver list in order, so pressing the button moves the same shared walk the keeper
 * moves and tells nobody anything about the person who pressed it.
 */
export function DrawsPanel({
  config,
  saver,
  draws,
  now,
  reveal,
  money,
  refresh,
}: {
  config: HearthConfig;
  saver: SaverState;
  draws: DrawView[];
  now: number;
  reveal: Reveal;
  money: ReturnType<typeof useActions>;
  refresh: () => void;
}) {
  return (
    <Panel title="Your draws" step="3" hint={`${draws.length} most recent`}>
      {draws.length === 0 ? (
        <p className="text-[14px] leading-relaxed text-muted">
          No period has finished yet, so there is no draw to show. The first one appears as soon as
          period 1 is over.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {draws.map((draw) => (
            <DrawCard
              key={draw.drawId}
              draw={draw}
              config={config}
              saver={saver}
              now={now}
              reveal={reveal}
              money={money}
              refresh={refresh}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

function DrawCard({
  draw,
  config,
  saver,
  now,
  reveal,
  money,
  refresh,
}: {
  draw: DrawView;
  config: HearthConfig;
  saver: SaverState;
  now: number;
  reveal: Reveal;
  money: ReturnType<typeof useActions>;
  refresh: () => void;
}) {
  // One scope per draw, so this card opens and seals on its own and says nothing about what any
  // other panel on the page is showing.
  const view = reveal.scope(drawScope(draw.drawId));
  const mine = draw.mine;
  const weight = mine ? view.read(mine.weightHandle) : null;
  const credit = mine ? view.read(mine.creditHandle) : null;
  const opened = view.open;
  const inWindow = now < draw.windowEndsAt;
  const offeredAnything = draw.offered.some((value) => value > 0n);

  const askMine = () => {
    if (!config.vault || !mine) return;
    view.reveal([
      { handle: mine.weightHandle, contractAddress: config.vault },
      { handle: mine.creditHandle, contractAddress: config.vault },
    ]);
  };

  const state = describe(draw, saver, now);

  return (
    <div className="rounded-card border border-hairline bg-[rgba(10,10,10,0.5)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-[17px] tabular-nums text-parchment" style={{ fontWeight: 640 }}>
            Draw {draw.drawId}
          </span>
          <Pill tone={state.tone}>{state.badge}</Pill>
        </div>
        <span className="text-[12px] tabular-nums text-faint">
          {draw.status === "none" && draw.closeDeadline > now
            ? `closable for another ${countdown(draw.closeDeadline, now)}`
            : inWindow
              ? `window ends in ${countdown(draw.windowEndsAt, now)}`
              : `window ended ${formatUtc(draw.windowEndsAt)}`}
        </span>
      </div>

      <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{state.line}</p>

      {draw.status === "awarded" && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-faint">
          <span>
            bracket <span className="tabular-nums text-parchment">2^{draw.scaleBits}</span>
          </span>
          {draw.prize.map((prize, tier) => (
            <span key={tier}>
              {TIER_NAMES[tier].toLowerCase()}{" "}
              <span className="tabular-nums text-parchment">{formatAmount(prize)}</span> each
            </span>
          ))}
          <span>
            walk{" "}
            <span className="tabular-nums text-parchment">
              {draw.walkCount === 0 ? "not started" : `${draw.cursor} of ${draw.walkCount}`}
            </span>
          </span>
        </div>
      )}

      {!mine && draw.status === "awarded" && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-hairlineSoft pt-3">
          <span className="text-[12px] uppercase tracking-label text-faint">Your result</span>
          <SealedBars count={4} label="a result, encrypted" />
          <Button size="small" tone="ghost" disabled>
            Reveal my result
          </Button>
          <span className="text-[12.5px] leading-relaxed text-faint">
            Connect a wallet and this opens on its own, without sealing anything else on the page.
          </span>
        </div>
      )}

      {mine && draw.status === "awarded" && (
        <div className="mt-3 border-t border-hairlineSoft pt-3">
          {!mine.evaluated ? (
            <div className="flex flex-wrap items-center gap-3">
              {inWindow ? (
                <>
                  <Button
                    size="small"
                    disabled={money.busy || saver.wrongNetwork}
                    busy={money.busy && money.label === `Advance draw ${draw.drawId}`}
                    onClick={() => money.evaluate(draw.drawId, EVALUATE_BATCH, refresh)}
                  >
                    Advance the draw
                  </Button>
                  <span className="text-[12.5px] leading-relaxed text-faint">
                    Moves the shared walk on by up to {String(EVALUATE_BATCH)} savers. It cannot be aimed at
                    you, so pressing it says nothing about whether you won.
                  </span>
                </>
              ) : (
                <span className="text-[12.5px] leading-relaxed text-faint">
                  The window closed before the walk reached you, so this draw pays you nothing and the
                  money went back to the tiers. Nobody can evaluate it now.
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[12px] uppercase tracking-label text-faint">Your result</span>
                {opened && credit !== null ? (
                  credit > 0n ? (
                    <span className="font-display text-[18px] tabular-nums text-flame" style={{ fontWeight: 640 }}>
                      {formatAmount(credit)} USDC
                    </span>
                  ) : (
                    <span className="text-[13px] text-muted">no prize this draw</span>
                  )
                ) : (
                  <SealedBars count={4} label="your result, encrypted" />
                )}
              </div>

              {!opened && (
                <Button size="small" tone="ghost" busy={view.state.kind === "working"} onClick={askMine}>
                  Reveal my result
                </Button>
              )}
              {opened && (
                <Button size="small" tone="quiet" onClick={view.hide}>
                  Seal it again
                </Button>
              )}
              {view.state.kind === "working" && (
                <span className="flex items-center gap-2 text-[12px] text-muted">
                  <Spinner size={12} />
                  {view.state.note}
                </span>
              )}
              {view.state.kind === "denied" && (
                <span className="text-[12px] text-bad">
                  Refused: this result belongs to a different address.
                </span>
              )}
              {view.state.kind === "failed" && (
                <span className="text-[12px] text-bad">{view.state.error.message}</span>
              )}

              {opened && credit !== null && credit > 0n && (
                <Button
                  size="small"
                  tone="primary"
                  disabled={money.busy || saver.wrongNetwork}
                  busy={money.busy && money.label === "Withdraw"}
                  onClick={() => money.withdraw(credit, refresh)}
                >
                  Claim {formatAmount(credit)} USDC
                </Button>
              )}

              {opened && weight !== null && (
                <span className="text-[12px] tabular-nums text-faint">
                  weight {weight.toLocaleString("en-US")} balance-seconds
                </span>
              )}
            </div>
          )}

          {opened && credit !== null && credit > 0n && (
            <p className="mt-2 text-[12.5px] leading-relaxed text-faint">
              Claiming is an ordinary withdrawal for exactly that amount. On chain it has the same
              shape as any other withdrawal, which is what stops a claim naming the winner.
            </p>
          )}
        </div>
      )}

      {draw.status === "awarded" && !offeredAnything && (
        <p className="mt-2 text-[12.5px] text-faint">
          This draw offered no prize money: no harvest had been booked yet when it closed.
        </p>
      )}
    </div>
  );
}

function describe(draw: DrawView, saver: SaverState, now: number): { badge: string; tone: "quiet" | "flame" | "good" | "bad"; line: string } {
  if (draw.status === "none") {
    if (now < draw.closeDeadline) {
      return {
        badge: "not closed",
        tone: "quiet",
        line: "The period is over and this draw is waiting to be closed. Anyone can close it, including you from the draw panel below.",
      };
    }
    return {
      badge: "missed",
      tone: "bad",
      line: "Nobody closed this draw before its deadline, so it pays nothing. Its liquidity was never moved and the next close offers it again.",
    };
  }

  if (draw.status === "closed") {
    return {
      badge: "awaiting the proof",
      tone: "flame",
      line: "Closed. The seed, the bracket, the non-empty flag and the harvest are published and waiting for Zama's key management service to sign their cleartexts. Anyone can fetch them and award the draw.",
    };
  }

  if (draw.status === "empty") {
    return {
      badge: "empty",
      tone: "quiet",
      line: "Nobody held a balance during this period, so there was nothing to weigh. The offered liquidity went straight back to the tiers.",
    };
  }

  if (draw.status === "skipped") {
    return {
      badge: "skipped",
      tone: "quiet",
      line: "The award landed after the draw's window, so no prize was paid. The liquidity went back to the tiers and the harvest was still booked.",
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
    };
  }
  if (!saver.isSaver) {
    return {
      badge: "awarded",
      tone: "good",
      line: evaluatedAll
        ? "Awarded and every saver evaluated. This wallet was not in the pool at the time."
        : "Awarded. The evaluation walk is still running, and this wallet is not in it.",
    };
  }
  return {
    badge: "awarded",
    tone: "good",
    line: evaluatedAll
      ? "Awarded, and the walk has reached every saver in it. Every result is fixed and written."
      : "Awarded. From this moment every result is already decided: the thresholds are public and the weights can no longer change. Evaluation only writes them down.",
  };
}
