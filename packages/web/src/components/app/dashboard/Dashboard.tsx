"use client";

import { useDraws, useHearthConfig, useNow, usePoolState, useSaverState } from "@/hooks/useHearth";
import { BALANCE_SCOPE, useReveal } from "@/hooks/useReveal";
import { CONFIGURED } from "@/lib/chain/addresses";
import { NextAction } from "./NextAction";
import { chooseNextStep, latestWrittenResult } from "./nextStep";
import { PoolNow } from "./PoolNow";
import { Position } from "./Position";

/**
 * The first screen after the landing page: what you hold, what the pool is doing, and the one
 * thing to do next.
 *
 * It reads and it routes. Nothing here sends a transaction, so a newcomer can look at the whole
 * product before their wallet is ever asked for anything.
 */
export function Dashboard() {
  const config = useHearthConfig();
  const pool = usePoolState();
  const saver = useSaverState(config);
  const draws = useDraws(pool.period);
  const reveal = useReveal();
  const now = useNow();

  // The scope is taken here rather than inside the card, so the step that offers a claim and the
  // figure that was opened are reading the same decryption.
  const balance = reveal.scope(BALANCE_SCOPE);

  // Both hooks fall back to zero for a read that has not answered. A step chosen from those
  // fallbacks would tell a funded wallet to visit the faucet, so the step waits for the batch.
  const positionKnown = saver.connected && !saver.isLoading && !saver.unavailable;
  const drawsKnown = pool.known.period && !draws.isLoading && !draws.unavailable;

  const step = chooseNextStep({
    connected: saver.connected,
    wrongNetwork: saver.wrongNetwork,
    positionKnown,
    usdc: saver.usdc,
    hasConfidential: saver.confidentialHandle !== null,
    isSaver: saver.isSaver,
    winnings: balance.read(saver.winningsHandle),
    drawsKnown,
    resultDrawId: latestWrittenResult(draws.draws),
  });

  return (
    <>
      {/* With no addresses configured there is nothing to read and no step worth naming. The
          shell's banner already says which environment variables are missing. */}
      {CONFIGURED && <NextAction step={step} />}

      <div className="flex flex-col gap-4">
        <Position config={config} saver={saver} scope={balance} known={positionKnown} />
        <PoolNow pool={pool} now={now} />
      </div>
    </>
  );
}
