"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ActionNote,
  CAP_LABEL,
  CARD_NOTE,
  CARD_PROSE,
  Card,
  CardPill,
  INLINE_LINK,
  PrimaryButton,
  SealedValue,
  Unknown,
  phaseNote,
} from "@/components/app/console";
import { SealedBars } from "@/components/ui";
import { EVALUATE_BATCH, TIER_NAMES } from "@/lib/chain/addresses";
import { countdown, formatAmount, formatUtc } from "@/lib/format";
import type { useActions } from "@/hooks/useActions";
import { BALANCE_SCOPE, drawScope, type Reveal, type RevealRequest } from "@/hooks/useReveal";
import type { DrawView, HearthConfig, SaverState } from "@/hooks/useHearth";
import { describe } from "./describe";
import { Fact } from "./Fact";

/**
 * One draw: what it paid the pool, and what it paid this wallet.
 *
 * Advancing the walk is not a claim. Evaluation starts at a point the draw's own seed decides and
 * runs the saver list in order, so pressing the button moves the same shared walk the keeper
 * moves and tells nobody anything about the person who pressed it.
 */
export function DrawCard({
  draw,
  config,
  saver,
  now,
  reveal,
  money,
  refresh,
  active,
  onStart,
}: {
  draw: DrawView;
  config: HearthConfig;
  saver: SaverState;
  now: number;
  reveal: Reveal;
  money: ReturnType<typeof useActions>;
  refresh: () => void;
  /** True when this card started the transaction that is running, so only it reports on it. */
  active: boolean;
  onStart: (drawId: number) => void;
}) {
  // One scope per draw, so this card opens and seals on its own and says nothing about what any
  // other card on the page is showing.
  const view = reveal.scope(drawScope(draw.drawId));
  // The draw's credit handle never changes, so the card would keep offering the same claim after
  // it has been paid. The chain would honour a second press as a second withdrawal.
  const [claimed, setClaimed] = useState(false);

  const summary = describe(draw, saver, now);
  const mine = draw.mine;
  const credit = mine ? view.read(mine.creditHandle) : null;
  const opened = view.open;
  const awarded = draw.known && draw.status === "awarded";
  const windowKnown = draw.windowEndsAt > 0;
  const inWindow = windowKnown && now < draw.windowEndsAt;
  const offeredAnything = draw.offered.some((value) => value > 0n);

  // One press opens both of this wallet's figures, so the second one costs no extra signature.
  const requests: RevealRequest[] =
    mine && config.vault
      ? [
          { handle: mine.weightHandle, contractAddress: config.vault },
          { handle: mine.creditHandle, contractAddress: config.vault },
        ]
      : [];

  // Gated on the same reads the figures are drawn from, so a refetch that comes back short cannot
  // leave a claim button standing under a card that has stopped showing a result.
  const claimable =
    awarded && mine !== null && mine.evaluated && opened && !claimed && credit !== null && credit > 0n;
  const advanceable = awarded && mine !== null && !mine.evaluated && inWindow;

  const action = claimable ? (
    <div className="flex flex-col gap-3">
      <p className={CARD_NOTE}>
        Claiming is an ordinary withdrawal for exactly that amount. On chain it has the same shape as
        any other withdrawal, which is what stops a claim naming the winner.
      </p>
      <PrimaryButton
        disabled={money.busy || saver.wrongNetwork}
        busy={money.busy && active}
        onClick={() => {
          if (money.busy || credit === null) return;
          onStart(draw.drawId);
          money.withdraw(credit, () => {
            setClaimed(true);
            // Both scopes are stale the moment the claim lands: this credit is spent, and the
            // saver's principal and winnings handles have changed under it.
            view.hide();
            reveal.scope(BALANCE_SCOPE).hide();
            refresh();
          });
        }}
      >
        Claim {formatAmount(credit)} USDC
      </PrimaryButton>
    </div>
  ) : advanceable ? (
    <div className="flex flex-col gap-3">
      <p className={CARD_NOTE}>
        Advancing moves the shared walk on by up to {String(EVALUATE_BATCH)} savers, in the order this
        draw&apos;s seed set. It cannot be aimed at you, so pressing it says nothing about whether you
        won.
      </p>
      <PrimaryButton
        tone="quiet"
        disabled={money.busy || saver.wrongNetwork}
        busy={money.busy && active}
        onClick={() => {
          if (money.busy) return;
          onStart(draw.drawId);
          money.evaluate(draw.drawId, EVALUATE_BATCH, refresh);
        }}
      >
        Advance the draw
      </PrimaryButton>
    </div>
  ) : summary.waitingOnRun ? (
    <p className={CARD_PROSE}>
      This step is open to anybody.{" "}
      <Link href="/app/run" className={INLINE_LINK}>
        Run a draw
      </Link>{" "}
      has it.
    </p>
  ) : null;

  // The note is mounted for any card that offers a button, not only the card that is running one.
  // A live region inserted at the same moment as its first message is announced unreliably, and
  // this line is what tells a screen reader the wallet is waiting.
  const footer =
    action || active ? (
      <div className="flex flex-col gap-3">
        {action}
        <ActionNote
          {...(active ? phaseNote(money.phase, money.label, money.reset) : { tone: "working" as const, text: null })}
        />
      </div>
    ) : undefined;

  return (
    <Card
      label={`Draw ${draw.drawId}`}
      pill={<CardPill tone={summary.tone}>{summary.badge}</CardPill>}
      footer={footer}
    >
      <p className={`max-w-[70ch] ${CARD_PROSE}`}>{summary.line}</p>

      {draw.known && (
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-hairlineSoft pt-4 sm:grid-cols-4">
          <Fact
            label={`Period ${draw.drawId} ended`}
            value={
              draw.periodEndsAt > 0 ? (
                formatUtc(draw.periodEndsAt)
              ) : (
                <Unknown scale="inline" reason="The end of this period has not come back from the chain yet." />
              )
            }
          />

          {draw.status === "none" ? (
            <Fact
              label="Close deadline"
              value={
                draw.closeDeadline === 0 ? (
                  <Unknown scale="inline" reason="This draw's close deadline has not come back from the chain yet." />
                ) : now < draw.closeDeadline ? (
                  countdown(draw.closeDeadline, now)
                ) : (
                  "passed"
                )
              }
              note={draw.closeDeadline > 0 ? formatUtc(draw.closeDeadline) : undefined}
            />
          ) : (
            <Fact
              label="Prize window"
              value={
                !windowKnown ? (
                  <Unknown scale="inline" reason="This draw's window has not come back from the chain yet." />
                ) : inWindow ? (
                  `${countdown(draw.windowEndsAt, now)} left`
                ) : (
                  "closed"
                )
              }
              note={windowKnown ? formatUtc(draw.windowEndsAt) : undefined}
            />
          )}

          {awarded && (
            <>
              <Fact
                label="Bracket"
                value={`2^${draw.scaleBits}`}
                note="published in place of the pool's total weight"
              />
              <Fact
                label="Walk"
                value={draw.walkCount === 0 ? "not started" : `${draw.cursor} of ${draw.walkCount}`}
                note={`up to ${String(EVALUATE_BATCH)} savers per call`}
              />
            </>
          )}
        </dl>
      )}

      {awarded && (
        <div className="mt-4 border-t border-hairlineSoft pt-4">
          <p className={CAP_LABEL}>What one prize was worth</p>
          <dl className="mt-2.5 grid grid-cols-3 gap-x-6 gap-y-3">
            {draw.prize.map((prize, tier) => (
              <Fact key={tier} label={TIER_NAMES[tier]} value={`${formatAmount(prize)} USDC`} />
            ))}
          </dl>
          {!offeredAnything && (
            <p className={`mt-3 ${CARD_NOTE}`}>
              This draw offered no prize money: no harvest had been booked yet when it closed.
            </p>
          )}
        </div>
      )}

      {awarded && (
        <div className="mt-4 border-t border-hairlineSoft pt-4">
          <p className={CAP_LABEL}>Your result</p>

          {!mine ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <SealedBars count={4} label="a result, encrypted" />
              <span className={CARD_PROSE}>
                Encrypted on chain, and readable only by the wallet it belongs to.
              </span>
            </div>
          ) : !mine.evaluated ? (
            <p className={`mt-2 max-w-[70ch] ${CARD_PROSE}`}>
              {!windowKnown
                ? "The walk has not reached you yet, and this draw's window has not come back from the chain, so the page cannot say whether it can still be advanced."
                : inWindow
                  ? "The walk has not reached you yet. Until it does, this draw holds no figure for you, won or not."
                  : "The window closed before the walk reached you, so this draw pays you nothing and the money went back to the tiers. Nobody can evaluate it now."}
            </p>
          ) : (
            <>
              <div className="mt-2.5 flex flex-wrap items-start gap-x-12 gap-y-5">
                <Figure label="Your prize">
                  <SealedValue
                    scope={view}
                    handle={mine.creditHandle}
                    requests={requests}
                    label={`your prize in draw ${draw.drawId}`}
                    unit="USDC"
                    size="large"
                    disabled={requests.length === 0 || saver.wrongNetwork}
                  />
                </Figure>

                <Figure label="Your weight">
                  <SealedValue
                    scope={view}
                    handle={mine.weightHandle}
                    requests={requests}
                    label={`your weight in draw ${draw.drawId}`}
                    unit="balance-seconds"
                    format={(weight) => weight.toLocaleString("en-US")}
                    eye={false}
                  />
                </Figure>
              </div>

              {opened && credit === 0n && !claimed && (
                <p className={`mt-3 max-w-[70ch] ${CARD_PROSE}`}>
                  No prize this draw. Your weight was counted and the thresholds did not fall your way.
                </p>
              )}

              {claimed && (
                <p className="mt-3 max-w-[70ch] text-[13.5px] leading-relaxed text-good">
                  Claimed. That amount went to your wallet, out of winnings first. The draw keeps the
                  figure as its record.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}

/** A label over one sealed figure, so the two in a card are told apart before either is opened. */
function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className={CAP_LABEL}>{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
