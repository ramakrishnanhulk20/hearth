"use client";

import { useAccount } from "wagmi";
import {
  ActionNote,
  CARD_PROSE,
  Card,
  CardPill,
  ConnectPrompt,
  Stat,
  Unknown,
  phaseNote,
} from "@/components/app/console";
import { CHAIN_ID, EVALUATE_BATCH, TIER_NAMES } from "@/lib/chain/addresses";
import { countdown } from "@/lib/format";
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

/** The period as a person would say it, so the keeper's cadence is read rather than typed here. */
function periodLabel(seconds: number): string {
  if (seconds % 3600 === 0) {
    const hours = seconds / 3600;
    return hours === 1 ? "one hour" : `${hours} hours`;
  }
  if (seconds % 60 === 0) return `${seconds / 60} minutes`;
  return `${seconds} seconds`;
}

export function RunScreen() {
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
        ? { kind: "waiting", note: "The prize pool is paused, so no draw can be closed." }
        : closable > 0
          ? {
              kind: "ready",
              note:
                pool.closeDeadline > 0
                  ? `Draw ${closable} can be closed for another ${countdown(pool.closeDeadline, now)}. Past that it is skipped and its money stays in the tiers.`
                  : `Draw ${closable} is waiting to be closed.`,
            }
          : {
              kind: "waiting",
              note:
                pool.known.period && pool.periodEndsAt > 0
                  ? `No draw is waiting. Draw ${pool.period} becomes closable in ${countdown(pool.periodEndsAt, now)}, when this period ends.`
                  : "No draw is waiting to be closed.",
            };

  const awardAvailability: Availability = !drawsAnswered
    ? UNKNOWN
    : awaiting
      ? {
          kind: "ready",
          note: `Draw ${awaiting.drawId} is closed and waiting. The four proofs are fetched first, which takes a few seconds, and then your wallet asks you to sign.`,
        }
      : { kind: "waiting", note: "No closed draw is waiting for its award." };

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
              ? `${evaluating.cursor} of ${walkTotal} savers done on draw ${evaluating.drawId}. Each call moves the shared walk on by up to ${String(EVALUATE_BATCH)}, which is what one transaction pays for.`
              : `Draw ${evaluating.drawId} still has savers to cover. Each call moves the shared walk on by up to ${String(EVALUATE_BATCH)}, which is what one transaction pays for.`,
        }
      : { kind: "waiting", note: "No awarded draw has savers left inside its window." };

  const finalizeAvailability: Availability = !drawsAnswered
    ? UNKNOWN
    : finalizable
      ? {
          kind: "ready",
          note: `Draw ${finalizable.drawId} has finished its window, so nothing more can be credited from it.`,
        }
      : {
          kind: "waiting",
          note:
            finalizeSoon && finalizeSoon.windowEndsAt > 0
              ? `No window has ended. Draw ${finalizeSoon.drawId} can be finalized in ${countdown(finalizeSoon.windowEndsAt, now)}.`
              : "No draw has finished its window without being finalized.",
        };

  const reconcileAvailability: Availability = !vaultAnswered
    ? UNKNOWN
    : firstPending
      ? {
          kind: "ready",
          note:
            `The ${TIER_NAMES[firstPending.index].toLowerCase()} tier published its carry at draw ${firstPending.tier.carryPublishedAt}.` +
            (pendingTiers.length > 1
              ? ` ${pendingTiers.length - 1} more ${pendingTiers.length === 2 ? "tier is" : "tiers are"} behind it, and each press does one.`
              : ""),
        }
      : { kind: "waiting", note: "No tier has a carry waiting to be booked back." };

  const availabilities: Record<StepKey, Availability> = {
    close: closeAvailability,
    award: awardAvailability,
    advance: advanceAvailability,
    finalize: finalizeAvailability,
    reconcile: reconcileAvailability,
  };

  const dueKey = DUE_ORDER.find((key) => availabilities[key].kind === "ready") ?? null;

  const blocked = !isConnected
    ? "Connect a wallet to send this."
    : chainId !== CHAIN_ID
      ? "Your wallet is on another network."
      : actions.busy
        ? "Another transaction is already in flight."
        : null;

  const reason = (key: StepKey): string | null => {
    const availability = availabilities[key];
    if (availability.kind === "unknown") return "Whether this step is available has not come back from the chain yet.";
    if (availability.kind === "waiting") return availability.note;
    return blocked;
  };

  const running = (label: string) => actions.busy && actions.label === label;

  const steps: RunStep[] = [
    {
      key: "close",
      title: "Close",
      headline: closable > 0 ? `Close draw ${closable}` : "Close a draw",
      does: "Fixes each tier's prize size from the money sitting in it, moves that money into the draw, harvests the yield source, and draws an encrypted seed that nobody, us included, can read.",
      availability: closeAvailability,
      due: dueKey === "close",
      buttonLabel: "Close",
      onRun: closable > 0 ? () => actions.closeDraw(closable, refresh) : undefined,
      busy: running(`Close draw ${closable}`),
      blocked: reason("close"),
    },
    {
      key: "award",
      title: "Award",
      headline: awaiting ? `Award draw ${awaiting.drawId}` : "Award a draw",
      does: "Hands the pool the cleartexts of the four values the close published, with the key management service's signature over them. The pool checks that signature on chain, books the harvest into the tiers and opens the draw. Winners are decided at this moment.",
      availability: awardAvailability,
      due: dueKey === "award",
      buttonLabel: "Award",
      onRun: awaiting ? () => actions.awardDraw(awaiting.drawId, refresh) : undefined,
      busy: awaiting !== undefined && running(`Award draw ${awaiting.drawId}`),
      blocked: reason("award"),
    },
    {
      key: "advance",
      title: "Advance",
      headline: evaluating ? `Advance draw ${evaluating.drawId}` : "Advance a draw",
      does: "Walks the saver list from a point the seed decides and credits each saver what the published thresholds say they won. The caller chooses how many savers a call covers, never which ones, so sending this says nothing about who you are in the draw.",
      availability: advanceAvailability,
      due: dueKey === "advance",
      buttonLabel: "Advance",
      onRun: evaluating ? () => actions.evaluate(evaluating.drawId, EVALUATE_BATCH, refresh) : undefined,
      busy: evaluating !== undefined && running(`Advance draw ${evaluating.drawId}`),
      blocked: reason("advance"),
    },
    {
      key: "finalize",
      title: "Finalize",
      headline: finalizable ? `Finalize draw ${finalizable.drawId}` : "Finalize a draw",
      does: "Folds every tier's unpaid remainder into that tier's encrypted carry once the window is over, and publishes the carry of each tier whose turn it is.",
      availability: finalizeAvailability,
      due: dueKey === "finalize",
      buttonLabel: "Finalize",
      onRun: finalizable ? () => actions.finalizeDraw(finalizable.drawId, refresh) : undefined,
      busy: finalizable !== undefined && running(`Finalize draw ${finalizable.drawId}`),
      blocked: reason("finalize"),
    },
    {
      key: "reconcile",
      title: "Reconcile",
      headline: firstPending
        ? `Reconcile the ${TIER_NAMES[firstPending.index].toLowerCase()} tier`
        : "Reconcile a tier",
      does: "Fetches the cleartext of a published carry, proves it to the pool and books the money back into that tier's plaintext liquidity, so the next close can offer it again.",
      availability: reconcileAvailability,
      due: dueKey === "reconcile",
      buttonLabel: "Reconcile",
      onRun: firstPending ? () => actions.reconcile(firstPending.index, refresh) : undefined,
      busy: firstPending !== undefined && running(`Reconcile tier ${firstPending.index}`),
      blocked: reason("reconcile"),
    },
  ];

  const dueStep = steps.find((step) => step.key === dueKey) ?? null;
  const anyUnknown = steps.some((step) => step.availability.kind === "unknown");
  const orderingApplies =
    (dueKey === "finalize" || dueKey === "reconcile") && closeAvailability.kind === "ready";

  return (
    <div className="flex flex-col gap-4">
      <ConnectPrompt note="The five steps below read from the chain either way, so the screen is worth looking at before you connect anything.">
        Connect a wallet to send any of these. None of them needs a privilege the contracts
        recognise, and none of them can be aimed at a particular saver.
      </ConnectPrompt>

      <Card tone={dueStep ? "accent" : "plain"}>
        <Stat
          label="What the pool is waiting for"
          accent={Boolean(dueStep)}
          value={dueStep ? dueStep.headline : anyUnknown ? <Unknown /> : "Nothing"}
          note={
            dueStep ? (
              <>
                {dueStep.availability.kind === "ready" ? dueStep.availability.note : null}
                {orderingApplies && (
                  <>
                    {" "}
                    A draw is ready to close as well. Finalizing and reconciling go first, because the
                    money a carry frees is what the next close sizes its prizes from.
                  </>
                )}
              </>
            ) : anyUnknown ? (
              "The reads that say which step is due have not come back from the chain yet."
            ) : pool.known.period && pool.periodEndsAt > 0 ? (
              `Either the keeper has kept up or this period is still running. It ends in ${countdown(pool.periodEndsAt, now)}.`
            ) : (
              "Either the keeper has kept up or this period is still running."
            )
          }
        />
      </Card>

      <Card label="The five steps, in the order a draw needs them">
        <StepRail steps={steps} />
      </Card>

      <ActionNote {...phaseNote(actions.phase, actions.label, actions.reset)} />

      <Card label="Who sends these">
        <div className={`flex max-w-[68ch] flex-col gap-3 ${CARD_PROSE}`}>
          <p>
            A keeper we run watches the pool and sends each of these as it comes due, so in an ordinary
            hour there is nothing on this screen to do.
            {config.ready
              ? ` A period here is ${periodLabel(config.periodLength)}, so a full round of five goes out that often.`
              : ""}{" "}
            The keeper holds no privilege the contracts recognise. The two things it could have abused,
            picking which savers get evaluated and picking the order prizes are paid in, are not choices
            any caller has.
          </p>
          <p>
            Award and reconcile are the two steps that need something from off chain. Your browser asks
            Zama&apos;s relayer for the cleartext of what the pool published, four values for an award and
            one for a reconcile, together with the key management service&apos;s signature over them. That
            is the same call the keeper makes, and the contract checks the signature itself, so a browser
            cannot lie about what it read.
          </p>
          <p>
            If the keeper stops, nothing is lost. A draw that is never closed keeps its money in the tiers
            and is offered again, and a carry that is never reconciled is folded back by the first close
            after it lands. A stalled keeper costs the pool draws, not money, and any wallet here can start
            them again.
          </p>
        </div>
      </Card>

      <Card label="Where the draws stand">
        <div className="grid gap-6 sm:grid-cols-3">
          <Stat
            label="Current period"
            value={pool.known.period ? pool.period : <Unknown />}
            note={
              pool.known.period && pool.periodEndsAt > 0
                ? `Ends in ${countdown(pool.periodEndsAt, now)}`
                : undefined
            }
          />
          <Stat
            label="Savers"
            value={pool.known.savers ? pool.savers : <Unknown />}
            note="How far a full walk has to travel"
          />
          <Stat
            label="Last closed draw"
            value={
              pool.known.lastClosedDraw ? (
                pool.lastClosedDraw === 0 ? (
                  "none yet"
                ) : (
                  pool.lastClosedDraw
                )
              ) : (
                <Unknown />
              )
            }
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <CardPill tone={!vaultAnswered ? "quiet" : pool.vaultPaused ? "warn" : "good"}>
            {!vaultAnswered ? "vault state unknown" : pool.vaultPaused ? "vault paused" : "vault running"}
          </CardPill>
          <CardPill tone={!poolAnswered ? "quiet" : pool.poolPaused ? "warn" : "good"}>
            {!poolAnswered
              ? "prize pool state unknown"
              : pool.poolPaused
                ? "prize pool paused"
                : "prize pool running"}
          </CardPill>
        </div>
      </Card>
    </div>
  );
}
