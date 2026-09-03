"use client";

import { Panel, Button, Row } from "@/components/ui";
import { EVALUATE_BATCH, TIER_NAMES } from "@/lib/chain/addresses";
import { countdown, formatUtc } from "@/lib/format";
import type { useActions } from "@/hooks/useActions";
import type { DrawView, PoolState, SaverState } from "@/hooks/useHearth";

/**
 * Every step of the draw, offered to anybody.
 *
 * None of these needs a key of ours. A keeper runs them as a convenience and Chainlink Automation
 * covers the close as a backup, but a saver who wants a draw advanced can always do it here, which
 * is what stops a keeper that declines to award a draw it lost from making the draw disappear.
 */
export function DrawControls({
  pool,
  saver,
  draws,
  now,
  draw,
  refresh,
}: {
  pool: PoolState;
  saver: SaverState;
  draws: DrawView[];
  now: number;
  draw: ReturnType<typeof useActions>;
  refresh: () => void;
}) {
  const closable = pool.closableDraw;
  const awaiting = draws.find((item) => item.status === "closed");
  const evaluating = draws.find(
    (item) => item.status === "awarded" && now < item.windowEndsAt && (item.walkCount === 0 || item.cursor < item.walkCount),
  );
  const finalizable = draws.find(
    (item) => item.status === "awarded" && item.opened && !item.finalized && now >= item.windowEndsAt,
  );
  const pendingCarry = pool.tiers.findIndex((tier) => tier.carryPending);

  const blocked = !saver.connected || saver.wrongNetwork || draw.busy;
  const nothing = closable === 0 && !awaiting && !evaluating && !finalizable && pendingCarry < 0;

  return (
    <Panel title="Run the draw" hint="every step is permissionless">
      <p className="text-[12.5px] leading-relaxed text-muted">
        Closing fixes the prize sizes and draws an encrypted seed. Awarding hands the key management
        service&apos;s signed cleartexts back to the pool, which verifies them on chain. Evaluating walks
        the saver list from a point the seed decides. Finalizing folds what nobody won into each
        tier&apos;s carry, and reconciling publishes it and puts it back on offer.
      </p>

      {/* Gated on the connection alone. The wrong network already has its own banner above, and
          saying it twice reads as two different problems. */}
      {!saver.connected && (
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
          Connect a wallet on Sepolia and any of these five is yours to run. None of them needs
          permission from us.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2.5">
        <Step
          title={closable > 0 ? `Close draw ${closable}` : "Close a draw"}
          detail={
            closable > 0
              ? `Draw ${closable} can be closed for another ${countdown(pool.closeDeadline, now)}, until ${formatUtc(pool.closeDeadline)}.`
              : pool.poolPaused
                ? "The pool is paused, so nothing can be closed."
                : "No draw is waiting to be closed. The next one opens when the current period ends."
          }
          action={
            <Button
              size="small"
              disabled={blocked || closable === 0 || pool.poolPaused}
              busy={draw.busy && draw.label === `Close draw ${closable}`}
              onClick={() => draw.closeDraw(closable, refresh)}
            >
              Close
            </Button>
          }
        />

        <Step
          title={awaiting ? `Award draw ${awaiting.drawId}` : "Award a draw"}
          detail={
            awaiting
              ? "The seed, the bracket, the non-empty flag and the harvest are published. This asks Zama's key management service for all four and sends the signed cleartexts back, in that exact order."
              : "No closed draw is waiting for its award."
          }
          action={
            <Button
              size="small"
              disabled={blocked || !awaiting}
              busy={draw.busy && awaiting !== undefined && draw.label === `Award draw ${awaiting.drawId}`}
              onClick={() => awaiting && draw.awardDraw(awaiting.drawId, refresh)}
            >
              Award
            </Button>
          }
        />

        <Step
          title={evaluating ? `Advance draw ${evaluating.drawId}` : "Advance a draw"}
          detail={
            evaluating
              ? `${evaluating.cursor} of ${evaluating.walkCount || pool.savers} savers done. Each call moves the shared walk on by up to ${String(EVALUATE_BATCH)} savers, which is what the vault costs out at per transaction.`
              : "No awarded draw has savers left to evaluate inside its window."
          }
          action={
            <Button
              size="small"
              disabled={blocked || !evaluating}
              busy={draw.busy && evaluating !== undefined && draw.label === `Advance draw ${evaluating.drawId}`}
              onClick={() => evaluating && draw.evaluate(evaluating.drawId, EVALUATE_BATCH, refresh)}
            >
              Advance
            </Button>
          }
        />

        <Step
          title={finalizable ? `Finalize draw ${finalizable.drawId}` : "Finalize a draw"}
          detail={
            finalizable
              ? "Its window is over. Finalizing folds each tier's unpaid remainder into that tier's carry and publishes the carries that are due."
              : "No draw has finished its window without being finalized."
          }
          action={
            <Button
              size="small"
              disabled={blocked || !finalizable}
              busy={draw.busy && finalizable !== undefined && draw.label === `Finalize draw ${finalizable.drawId}`}
              onClick={() => finalizable && draw.finalizeDraw(finalizable.drawId, refresh)}
            >
              Finalize
            </Button>
          }
        />

        <Step
          title={pendingCarry >= 0 ? `Reconcile the ${TIER_NAMES[pendingCarry].toLowerCase()} tier` : "Reconcile a tier"}
          detail={
            pendingCarry >= 0
              ? `That tier published its carry at draw ${pool.tiers[pendingCarry].carryPublishedAt}. Reconciling verifies the cleartext on chain and books it back into public liquidity, so the next close offers it again.`
              : "No tier has a published carry waiting."
          }
          action={
            <Button
              size="small"
              disabled={blocked || pendingCarry < 0}
              busy={draw.busy && pendingCarry >= 0 && draw.label === `Reconcile tier ${pendingCarry}`}
              onClick={() => pendingCarry >= 0 && draw.reconcile(pendingCarry, refresh)}
            >
              Reconcile
            </Button>
          }
        />
      </div>

      {nothing && (
        <p className="mt-4 text-[12.5px] text-faint">
          Nothing is waiting right now. Either the keeper is keeping up or the current period is still
          running.
        </p>
      )}

      <div className="mt-5 border-t border-hairlineSoft pt-4">
        <Row label="Last closed draw" value={pool.lastClosedDraw === 0 ? "none yet" : pool.lastClosedDraw} />
        <Row label="Vault" value={pool.vaultPaused ? "paused" : "running"} />
        <Row label="Prize pool" value={pool.poolPaused ? "paused" : "running"} />
      </div>
    </Panel>
  );
}

function Step({ title, detail, action }: { title: string; detail: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-hairlineSoft bg-[rgba(10,10,10,0.5)] p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-[13.5px] text-parchment">{title}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-faint">{detail}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
