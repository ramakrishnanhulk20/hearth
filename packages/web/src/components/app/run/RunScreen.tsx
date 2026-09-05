"use client";

import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";
import {
  ActionNote,
  CARD_PROSE,
  Card,
  CardPill,
  ConnectPrompt,
  Stat,
  Unknown,
  usePhaseNote,
} from "@/components/app/console";
import { CHAIN_ID, EVALUATE_BATCH, TIER_KEYS } from "@/lib/chain/addresses";
import { useFormat } from "@/hooks/useFormat";
import { useActions } from "@/hooks/useActions";
import { useDraws, useHearthConfig, useNow, usePoolState } from "@/hooks/useHearth";
import { StepRail, type Availability, type RunStep } from "./StepRail";

type StepKey = "close" | "award" | "advance" | "finalize" | "reconcile";

/**
 * The order a keeper sends them in when several are due at once, which is not the order a draw
 * needs them in. Finalizing and reconciling an older draw go before closing a newer one because
 * reconciling turns an earlier draw's carry back into plaintext liquidity, and a close sizes its
 * prizes from that liquidity at the moment it runs.
 */
const DUE_ORDER: StepKey[] = ["finalize", "reconcile", "close", "award", "advance"];

const UNKNOWN: Availability = { kind: "unknown" };

export function RunScreen() {
  const t = useTranslations("run");
  const tiersLower = useTranslations("dashboard.tiersLower");
  const format = useFormat();
  const phaseNote = usePhaseNote();
  const config = useHearthConfig();
  const pool = usePoolState();
  const { draws, refetch: refetchDraws } = useDraws(pool.period);
  const now = useNow();

  // One wallet sends one transaction at a time, so one action instance drives all five buttons
  // and one note reports whichever is running.
  const actions = useActions(config);

  // These five steps need nothing from the saver beyond an address on the right chain, so this
  // screen reads the wallet directly instead of pulling the seven-call saver batch it would
  // never look at.
  const { isConnected, chainId } = useAccount();

  const refresh = () => {
    pool.refetch();
    refetchDraws();
  };

  /**
   * The period as a person would say it, so the keeper's cadence is read rather than typed here.
   *
   * Both the number and the figure to print go in: languages that inflect around a count need
   * the number to pick the arm, and the figure itself is formatted here so its digits stay
   * Western in every language.
   */
  const periodLabel = (seconds: number): string => {
    const say = (key: string, value: number) =>
      t(key, { count: value, shown: format.count(value) });
    if (seconds % 3600 === 0) return say("who.periodHours", seconds / 3600);
    if (seconds % 60 === 0) return say("who.periodMinutes", seconds / 60);
    return say("who.periodSeconds", seconds);
  };

  // PoolKnown carries no flag for the pause reads or the published carries, so each of those
  // leans on a neighbour in the same multicall from the same contract.
  const vaultAnswered = pool.known.period;
  const poolAnswered = pool.known.scaleBits;
  const drawsAnswered = draws.length > 0 && draws.every((item) => item.known);

  const closable = pool.closableDraw;
  const awaiting = draws.find((item) => item.status === "closed");
  const evaluating = draws.find(
    (item) =>
      item.status === "awarded" &&
      now < item.windowEndsAt &&
      (item.walkCount === 0 || item.cursor < item.walkCount),
  );
  const finalizable = draws.find(
    (item) => item.status === "awarded" && item.opened && !item.finalized && now >= item.windowEndsAt,
  );
  const finalizeSoon = draws.find(
    (item) => item.status === "awarded" && item.opened && !item.finalized && now < item.windowEndsAt,
  );
  const pendingTiers = pool.tiers
    .map((tier, index) => ({ tier, index }))
    .filter((entry) => entry.tier.carryPending);
  const firstPending = pendingTiers[0];

  const closeAvailability: Availability =
    !pool.known.closableDraw || !poolAnswered
      ? UNKNOWN
      : pool.poolPaused
        ? { kind: "waiting", note: t("close.paused") }
        : closable > 0
          ? {
              kind: "ready",
              note:
                pool.closeDeadline > 0
                  ? t("close.readyDeadline", {
                      drawId: closable,
                      time: format.countdown(pool.closeDeadline, now),
                    })
                  : t("close.ready", { drawId: closable }),
            }
          : {
              kind: "waiting",
              note:
                pool.known.period && pool.periodEndsAt > 0
                  ? t("close.waitingClock", {
                      drawId: pool.period,
                      time: format.countdown(pool.periodEndsAt, now),
                    })
                  : t("close.waiting"),
            };

  const awardAvailability: Availability = !drawsAnswered
    ? UNKNOWN
    : awaiting
      ? { kind: "ready", note: t("award.ready", { drawId: awaiting.drawId }) }
      : { kind: "waiting", note: t("award.waiting") };

  const walkTotal = evaluating
    ? evaluating.walkCount > 0
      ? evaluating.walkCount
      : pool.known.savers
        ? pool.savers
        : null
    : null;

  const advanceAvailability: Availability = !drawsAnswered
    ? UNKNOWN
    : evaluating
      ? {
          kind: "ready",
          note:
            walkTotal !== null
              ? t("advance.readyCount", {
                  cursor: format.count(evaluating.cursor),
                  total: format.count(walkTotal),
                  drawId: evaluating.drawId,
                  batch: String(EVALUATE_BATCH),
                })
              : t("advance.ready", {
                  drawId: evaluating.drawId,
                  batch: String(EVALUATE_BATCH),
                }),
        }
      : { kind: "waiting", note: t("advance.waiting") };

  const finalizeAvailability: Availability = !drawsAnswered
    ? UNKNOWN
    : finalizable
      ? { kind: "ready", note: t("finalize.ready", { drawId: finalizable.drawId }) }
      : {
          kind: "waiting",
          note:
            finalizeSoon && finalizeSoon.windowEndsAt > 0
              ? t("finalize.waitingClock", {
                  drawId: finalizeSoon.drawId,
                  time: format.countdown(finalizeSoon.windowEndsAt, now),
                })
              : t("finalize.waiting"),
        };

  const reconcileAvailability: Availability = !vaultAnswered
    ? UNKNOWN
    : firstPending
      ? {
          kind: "ready",
          note:
            t("reconcile.ready", {
              tier: tiersLower(TIER_KEYS[firstPending.index]),
              drawId: firstPending.tier.carryPublishedAt,
            }) +
            (pendingTiers.length > 1
              ? t("reconcile.readyMore", {
                  count: pendingTiers.length - 1,
                  shown: format.count(pendingTiers.length - 1),
                })
              : ""),
        }
      : { kind: "waiting", note: t("reconcile.waiting") };

  const availabilities: Record<StepKey, Availability> = {
    close: closeAvailability,
    award: awardAvailability,
    advance: advanceAvailability,
    finalize: finalizeAvailability,
    reconcile: reconcileAvailability,
  };

  const dueKey = DUE_ORDER.find((key) => availabilities[key].kind === "ready") ?? null;

  const blocked = !isConnected
    ? t("blocked.connect")
    : chainId !== CHAIN_ID
      ? t("blocked.network")
      : actions.busy
        ? t("blocked.busy")
        : null;

  const reason = (key: StepKey): string | null => {
    const availability = availabilities[key];
    if (availability.kind === "unknown") return t("unknownStep");
    if (availability.kind === "waiting") return availability.note;
    return blocked;
  };

  const running = (key: string) => actions.busy && actions.label?.key === key;

  const steps: RunStep[] = [
    {
      key: "close",
      title: t("close.title"),
      headline: closable > 0 ? t("close.headline", { drawId: closable }) : t("close.headlineIdle"),
      does: t("close.does"),
      availability: closeAvailability,
      due: dueKey === "close",
      buttonLabel: t("close.button"),
      onRun: closable > 0 ? () => actions.closeDraw(closable, refresh) : undefined,
      busy: running("close"),
      blocked: reason("close"),
    },
    {
      key: "award",
      title: t("award.title"),
      headline: awaiting ? t("award.headline", { drawId: awaiting.drawId }) : t("award.headlineIdle"),
      does: t("award.does"),
      availability: awardAvailability,
      due: dueKey === "award",
      buttonLabel: t("award.button"),
      onRun: awaiting ? () => actions.awardDraw(awaiting.drawId, refresh) : undefined,
      busy: awaiting !== undefined && running("award"),
      blocked: reason("award"),
    },
    {
      key: "advance",
      title: t("advance.title"),
      headline: evaluating
        ? t("advance.headline", { drawId: evaluating.drawId })
        : t("advance.headlineIdle"),
      does: t("advance.does"),
      availability: advanceAvailability,
      due: dueKey === "advance",
      buttonLabel: t("advance.button"),
      onRun: evaluating ? () => actions.evaluate(evaluating.drawId, EVALUATE_BATCH, refresh) : undefined,
      busy: evaluating !== undefined && running("advance"),
      blocked: reason("advance"),
    },
    {
      key: "finalize",
      title: t("finalize.title"),
      headline: finalizable
        ? t("finalize.headline", { drawId: finalizable.drawId })
        : t("finalize.headlineIdle"),
      does: t("finalize.does"),
      availability: finalizeAvailability,
      due: dueKey === "finalize",
      buttonLabel: t("finalize.button"),
      onRun: finalizable ? () => actions.finalizeDraw(finalizable.drawId, refresh) : undefined,
      busy: finalizable !== undefined && running("finalize"),
      blocked: reason("finalize"),
    },
    {
      key: "reconcile",
      title: t("reconcile.title"),
      headline: firstPending
        ? t("reconcile.headline", { tier: tiersLower(TIER_KEYS[firstPending.index]) })
        : t("reconcile.headlineIdle"),
      does: t("reconcile.does"),
      availability: reconcileAvailability,
      due: dueKey === "reconcile",
      buttonLabel: t("reconcile.button"),
      onRun: firstPending ? () => actions.reconcile(firstPending.index, refresh) : undefined,
      busy: firstPending !== undefined && running("reconcile"),
      blocked: reason("reconcile"),
    },
  ];

  const dueStep = steps.find((step) => step.key === dueKey) ?? null;
  const anyUnknown = steps.some((step) => step.availability.kind === "unknown");
  const orderingApplies =
    (dueKey === "finalize" || dueKey === "reconcile") && closeAvailability.kind === "ready";

  return (
    <div className="flex flex-col gap-4">
      <ConnectPrompt note={t("connectNote")}>{t("connect")}</ConnectPrompt>

      <Card tone={dueStep ? "accent" : "plain"}>
        <Stat
          label={t("waitingFor")}
          accent={Boolean(dueStep)}
          value={dueStep ? dueStep.headline : anyUnknown ? <Unknown /> : t("nothing")}
          note={
            dueStep ? (
              <>
                {dueStep.availability.kind === "ready" ? dueStep.availability.note : null}
                {orderingApplies && t("ordering")}
              </>
            ) : anyUnknown ? (
              t("unknownDue")
            ) : pool.known.period && pool.periodEndsAt > 0 ? (
              t("idleWithClock", { time: format.countdown(pool.periodEndsAt, now) })
            ) : (
              t("idle")
            )
          }
        />
      </Card>

      <Card label={t("railLabel")}>
        <StepRail steps={steps} />
      </Card>

      <ActionNote {...phaseNote(actions.phase, actions.label, actions.reset, actions.blockedBy)} />

      <Card label={t("who.label")}>
        <div className={`flex max-w-[68ch] flex-col gap-3 ${CARD_PROSE}`}>
          <p>
            {t("who.oneStart")}
            {config.ready ? t("who.onePeriod", { period: periodLabel(config.periodLength) }) : ""}
            {t("who.oneEnd")}
          </p>
          <p>{t("who.two")}</p>
          <p>{t("who.three")}</p>
        </div>
      </Card>

      <Card label={t("stand.label")}>
        <div className="grid gap-6 sm:grid-cols-3">
          <Stat
            label={t("stand.period")}
            value={pool.known.period ? format.count(pool.period) : <Unknown />}
            note={
              pool.known.period && pool.periodEndsAt > 0
                ? t("stand.periodNote", { time: format.countdown(pool.periodEndsAt, now) })
                : undefined
            }
          />
          <Stat
            label={t("stand.savers")}
            value={pool.known.savers ? format.count(pool.savers) : <Unknown />}
            note={t("stand.saversNote")}
          />
          <Stat
            label={t("stand.lastClosed")}
            value={
              pool.known.lastClosedDraw ? (
                pool.lastClosedDraw === 0 ? (
                  t("stand.lastClosedNone")
                ) : (
                  format.count(pool.lastClosedDraw)
                )
              ) : (
                <Unknown />
              )
            }
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <CardPill tone={!vaultAnswered ? "quiet" : pool.vaultPaused ? "warn" : "good"}>
            {!vaultAnswered
              ? t("stand.vaultUnknown")
              : pool.vaultPaused
                ? t("stand.vaultPaused")
                : t("stand.vaultRunning")}
          </CardPill>
          <CardPill tone={!poolAnswered ? "quiet" : pool.poolPaused ? "warn" : "good"}>
            {!poolAnswered
              ? t("stand.poolUnknown")
              : pool.poolPaused
                ? t("stand.poolPaused")
                : t("stand.poolRunning")}
          </CardPill>
        </div>
      </Card>
    </div>
  );
}
