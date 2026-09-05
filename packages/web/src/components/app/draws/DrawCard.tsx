"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
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
  usePhaseNote,
} from "@/components/app/console";
import { SealedBars } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { EVALUATE_BATCH, TIER_KEYS } from "@/lib/chain/addresses";
import { useFormat } from "@/hooks/useFormat";
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
  const t = useTranslations("draws.card");
  const tiers = useTranslations("dashboard.tiers");
  const describeWords = useTranslations("describe");
  const units = useTranslations("format");
  const format = useFormat();
  const phaseNote = usePhaseNote();

  // One scope per draw, so this card opens and seals on its own and says nothing about what any
  // other card on the page is showing.
  const view = reveal.scope(drawScope(draw.drawId));

  const summary = describe(draw, saver, now);
  const mine = draw.mine;
  const credit = mine ? view.read(mine.creditHandle) : null;
  // What the vault still owes this wallet across every draw. The draw's own credit handle never
  // changes once written, so a card gated on that alone would offer the same claim again after a
  // reload and the chain would honour it as a second withdrawal out of principal. This figure
  // falls when a claim lands, which makes it the only honest gate.
  const unclaimed = view.read(saver.winningsHandle);
  const opened = view.open;
  const awarded = draw.known && draw.status === "awarded";
  const windowKnown = draw.windowEndsAt > 0;
  const inWindow = windowKnown && now < draw.windowEndsAt;
  const offeredAnything = draw.offered.some((value) => value > 0n);

  // One press opens all three of this wallet's figures, so the second and third cost no extra
  // signature. The vault's winnings handle rides along because the claim button is gated on it.
  const requests: RevealRequest[] =
    mine && config.vault
      ? [
          { handle: mine.weightHandle, contractAddress: config.vault },
          { handle: mine.creditHandle, contractAddress: config.vault },
          { handle: saver.winningsHandle, contractAddress: config.vault },
        ]
      : [];

  // Gated on the same reads the figures are drawn from, so a refetch that comes back short cannot
  // leave a claim button standing under a card that has stopped showing a result.
  const claimable =
    awarded &&
    mine !== null &&
    mine.evaluated &&
    opened &&
    credit !== null &&
    credit > 0n &&
    unclaimed !== null &&
    unclaimed > 0n;
  // Never more than the vault still owes. Asking for more would come out of principal, and the
  // vault clamps silently rather than reverting, so the screen has to hold the line itself.
  const claimAmount = claimable && credit !== null && unclaimed !== null
    ? (credit < unclaimed ? credit : unclaimed)
    : null;
  const advanceable = awarded && mine !== null && !mine.evaluated && inWindow;

  const action = claimable && claimAmount !== null ? (
    <div className="flex flex-col gap-3">
      <p className={CARD_NOTE}>{t("claimNote")}</p>
      <PrimaryButton
        disabled={money.busy || saver.wrongNetwork}
        busy={money.busy && active}
        onClick={() => {
          if (money.busy) return;
          onStart(draw.drawId);
          money.withdraw(claimAmount, () => {
            // Both scopes are stale the moment the claim lands: this credit is spent, and the
            // saver's principal and winnings handles have changed under it. Sealing this one is
            // also what takes the button away, because the gate reads the winnings figure.
            view.hide();
            reveal.scope(BALANCE_SCOPE).hide();
            refresh();
          });
        }}
      >
        {t("claim", { amount: format.amount(claimAmount, config.decimals), symbol: config.symbol })}
      </PrimaryButton>
    </div>
  ) : advanceable ? (
    <div className="flex flex-col gap-3">
      <p className={CARD_NOTE}>{t("advanceNote", { batch: String(EVALUATE_BATCH) })}</p>
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
        {t("advance")}
      </PrimaryButton>
    </div>
  ) : summary.waitingOnRun ? (
    <p className={CARD_PROSE}>
      {t("waitingLead")}
      <Link href={`/app/${config.slug}/run`} className={INLINE_LINK}>
        {t("waitingLink")}
      </Link>
      {t("waitingTail")}
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
          {...(active
            ? phaseNote(money.phase, money.label, money.reset, money.blockedBy)
            : { tone: "working" as const, text: null })}
        />
      </div>
    ) : undefined;

  return (
    <Card
      label={t("label", { drawId: draw.drawId })}
      pill={<CardPill tone={summary.tone}>{describeWords(summary.badge)}</CardPill>}
      footer={footer}
    >
      <p className={`max-w-[70ch] ${CARD_PROSE}`}>{describeWords(summary.line)}</p>

      {draw.known && (
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-hairlineSoft pt-4 sm:grid-cols-4">
          <Fact
            label={t("periodEnded", { drawId: draw.drawId })}
            value={
              draw.periodEndsAt > 0 ? (
                format.utc(draw.periodEndsAt)
              ) : (
                <Unknown scale="inline" reason={t("periodEndedUnknown")} />
              )
            }
          />

          {draw.status === "none" ? (
            <Fact
              label={t("closeDeadline")}
              value={
                draw.closeDeadline === 0 ? (
                  <Unknown scale="inline" reason={t("closeDeadlineUnknown")} />
                ) : now < draw.closeDeadline ? (
                  format.countdown(draw.closeDeadline, now)
                ) : (
                  t("passed")
                )
              }
              note={draw.closeDeadline > 0 ? format.utc(draw.closeDeadline) : undefined}
            />
          ) : (
            <Fact
              label={t("prizeWindow")}
              value={
                !windowKnown ? (
                  <Unknown scale="inline" reason={t("windowUnknown")} />
                ) : inWindow ? (
                  t("windowLeft", { time: format.countdown(draw.windowEndsAt, now) })
                ) : (
                  t("windowClosed")
                )
              }
              note={windowKnown ? format.utc(draw.windowEndsAt) : undefined}
            />
          )}

          {awarded && (
            <>
              <Fact
                label={t("bracket")}
                value={`2^${draw.scaleBits}`}
                note={t("bracketNote")}
              />
              <Fact
                label={t("walk")}
                value={
                  draw.walkCount === 0
                    ? t("walkNotStarted")
                    : t("walkProgress", {
                        cursor: format.count(draw.cursor),
                        total: format.count(draw.walkCount),
                      })
                }
                note={t("walkNote", { batch: String(EVALUATE_BATCH) })}
              />
            </>
          )}
        </dl>
      )}

      {awarded && (
        <div className="mt-4 border-t border-hairlineSoft pt-4">
          <p className={CAP_LABEL}>{t("prizeWorth")}</p>
          <dl className="mt-2.5 grid grid-cols-3 gap-x-6 gap-y-3">
            {draw.prize.map((prize, tier) => (
              <Fact
                key={tier}
                label={tiers(TIER_KEYS[tier])}
                value={`${format.amount(prize, config.decimals)} ${config.symbol}`}
              />
            ))}
          </dl>
          {!offeredAnything && (
            <p className={`mt-3 ${CARD_NOTE}`}>{t("noPrizeMoney")}</p>
          )}
        </div>
      )}

      {awarded && (
        <div className="mt-4 border-t border-hairlineSoft pt-4">
          <p className={CAP_LABEL}>{t("yourResult")}</p>

          {!mine ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <SealedBars count={4} label={t("sealedResult")} />
              <span className={CARD_PROSE}>{t("sealedResultNote")}</span>
            </div>
          ) : !mine.evaluated ? (
            <p className={`mt-2 max-w-[70ch] ${CARD_PROSE}`}>
              {!windowKnown
                ? t("notReachedUnknown")
                : inWindow
                  ? t("notReachedYet")
                  : t("missedWindow")}
            </p>
          ) : (
            <>
              <div className="mt-2.5 flex flex-wrap items-start gap-x-12 gap-y-5">
                <Figure label={t("yourPrize")}>
                  <SealedValue
                    scope={view}
                    handle={mine.creditHandle}
                    requests={requests}
                    label={t("yourPrizeSpoken", { drawId: draw.drawId })}
                    unit={config.symbol}
                    decimals={config.decimals}
                    size="large"
                    disabled={requests.length === 0 || saver.wrongNetwork}
                  />
                </Figure>

                <Figure label={t("yourWeight")}>
                  <SealedValue
                    scope={view}
                    handle={mine.weightHandle}
                    requests={requests}
                    label={t("yourWeightSpoken", { drawId: draw.drawId })}
                    unit={units("balanceSeconds")}
                    format={(weight) => format.count(weight)}
                    eye={false}
                  />
                </Figure>
              </div>

              {opened && credit === 0n && (
                <p className={`mt-3 max-w-[70ch] ${CARD_PROSE}`}>{t("noPrize")}</p>
              )}

              {/* Read off the chain rather than remembered from the press, so it survives a
                  reload and so a claim made in another tab shows up here too. Green on the
                  near-black card advances where it receded on white, so the sentence explaining
                  where the money went reads as prose and the colour stays on the pill. */}
              {opened && credit !== null && credit > 0n && unclaimed === 0n && (
                <p className={`mt-3 max-w-[70ch] ${CARD_PROSE}`}>{t("claimed")}</p>
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
