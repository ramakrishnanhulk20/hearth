"use client";

import { useState } from "react";
import { CARD_PROSE, ConnectPrompt, INLINE_LINK, PrimaryButton } from "@/components/app/console";
import { useTokenSymbols } from "@/components/app/useTokenSymbols";
import { txUrl } from "@/lib/chain/addresses";
import { useActions } from "@/hooks/useActions";
import { useDraws, useHearthConfig, usePoolState, useSaverState } from "@/hooks/useHearth";
import { useReveal } from "@/hooks/useReveal";
import { useUnshield } from "@/hooks/useUnshield";
import { StageTabs, panelId, tabId, type Stage } from "./StageTabs";
import { UnshieldStage } from "./UnshieldStage";
import { VaultStage } from "./VaultStage";

/**
 * Taking money out, in two stages that are shown one at a time.
 *
 * Out of the vault and out of the confidential token are different jobs with different risks: the
 * first is private and clamped, the second publishes a number. Putting them on one screen but
 * never on screen together is what keeps the second one from being clicked by momentum.
 */
export function WithdrawScreen() {
  const config = useHearthConfig();
  const pool = usePoolState();
  const saver = useSaverState(config);
  const { draws, refetch: refetchDraws } = useDraws(pool.period);
  const reveal = useReveal();
  const money = useActions(config);
  const unshield = useUnshield(config);
  const symbols = useTokenSymbols(config);

  const [stage, setStage] = useState<Stage>("vault");

  const refresh = () => {
    pool.refetch();
    saver.refetch();
    refetchDraws();
  };

  // Only draws whose read has landed count. A draw that has not answered yet defaults to the
  // status of an unclosed one, and a note about an open window is a claim rather than a guess.
  const windowOpen = draws.some(
    (draw) => draw.known && (draw.status === "none" || draw.status === "closed" || draw.status === "awarded"),
  );

  if (!saver.connected) {
    return (
      <ConnectPrompt note="Nothing here is ever locked. Principal comes back in full whenever you ask, including in the middle of a draw.">
        Connect a wallet to withdraw. Stage one takes principal and winnings out of the vault, stage
        two turns confidential USDC back into the plain kind.
      </ConnectPrompt>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {unshield.pending && (
        <div className="panel-glare rounded-card border border-warn/45 bg-warn/[0.08] px-5 py-5 sm:px-6">
          <p className="text-[13.5px] font-semibold text-parchment">
            An unshield was submitted and never finished.
          </p>
          <p className={`mt-1.5 ${CARD_PROSE}`}>
            The confidential tokens are already burned and the plain USDC is waiting on the wrapper.
            Sending the second transaction releases it.{" "}
            <a href={txUrl(unshield.pending)} target="_blank" rel="noopener noreferrer" className={INLINE_LINK}>
              See the unshield
            </a>
          </p>
          <div className="mt-4">
            <PrimaryButton
              busy={unshield.busy}
              disabled={saver.wrongNetwork}
              onClick={() => {
                // The progress of this belongs to stage two, so the screen moves to where it
                // will be reported rather than running it out of sight.
                setStage("unshield");
                void unshield.resume(refresh);
              }}
            >
              Finish the unshield
            </PrimaryButton>
          </div>
        </div>
      )}

      <StageTabs stage={stage} onChange={setStage} alert={unshield.pending ? "unshield" : null} />

      <div role="tabpanel" id={panelId(stage)} aria-labelledby={tabId(stage)}>
        {stage === "vault" ? (
          <VaultStage
            config={config}
            saver={saver}
            reveal={reveal}
            money={money}
            symbols={symbols}
            windowOpen={windowOpen}
            refresh={refresh}
          />
        ) : (
          <UnshieldStage
            config={config}
            saver={saver}
            reveal={reveal}
            unshield={unshield}
            symbols={symbols}
            refresh={refresh}
          />
        )}
      </div>
    </div>
  );
}
