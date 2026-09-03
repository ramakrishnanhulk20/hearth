"use client";

import { Panel, Button, Figure, SealedBars, Spinner } from "@/components/ui";
import { formatAmount } from "@/lib/format";
import type { useReveal } from "@/hooks/useReveal";
import type { HearthConfig, SaverState } from "@/hooks/useHearth";

/**
 * What this wallet holds and what it has won, sealed until its owner asks.
 *
 * Reveal is a signature, not a transaction: EIP-712 proof to Zama's relayer that you control the
 * address, in exchange for the plaintext of values the contract granted you. It costs no gas and
 * writes nothing to the chain, and nothing here runs until the button is pressed.
 */
export function BalancePanel({
  config,
  saver,
  reveal,
}: {
  config: HearthConfig;
  saver: SaverState;
  reveal: ReturnType<typeof useReveal>;
}) {
  const { state, read, hide } = reveal;
  const vault = config.vault;

  const principal = read(saver.principalHandle);
  const winnings = read(saver.winningsHandle);
  const open = state.kind === "open";

  const ask = () => {
    if (!vault) return;
    void reveal.reveal([
      { handle: saver.principalHandle, contractAddress: vault },
      { handle: saver.winningsHandle, contractAddress: vault },
    ]);
  };

  return (
    <Panel
      title="What you hold"
      step="2"
      hint={open ? "in this browser only" : "sealed"}
    >
      {!saver.connected ? (
        <p className="text-[14px] leading-relaxed text-muted">
          Connect a wallet to see your own balance. Nobody else can, and that is enforced by
          Zama&apos;s access control list on chain rather than promised by this page.
        </p>
      ) : !saver.isSaver ? (
        <p className="text-[14px] leading-relaxed text-muted">
          This wallet has never deposited, so there is no encrypted balance to open. Deposit above and
          this panel fills in.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-5">
            <Figure
              label="Principal"
              value={
                open && principal !== null ? (
                  formatAmount(principal)
                ) : (
                  <SealedBars count={5} label="your principal, encrypted" />
                )
              }
              unit={open && principal !== null ? "USDC" : undefined}
              note="What you have saved. Your odds are weighted by this over a whole period."
            />
            <Figure
              label="Unclaimed winnings"
              accent={open && winnings !== null && winnings > 0n}
              value={
                open && winnings !== null ? (
                  formatAmount(winnings)
                ) : (
                  <SealedBars count={4} label="your winnings, encrypted" />
                )
              }
              unit={open && winnings !== null ? "USDC" : undefined}
              note="Prize money credited to you and not yet withdrawn. It earns no odds of its own."
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-hairlineSoft pt-4">
            {open ? (
              <Button tone="ghost" size="small" onClick={hide}>
                Seal it again
              </Button>
            ) : (
              <Button tone="primary" size="small" busy={state.kind === "working"} onClick={ask}>
                Reveal
              </Button>
            )}

            {state.kind === "working" && (
              <span className="flex items-center gap-2 text-[12.5px] text-muted">
                <Spinner size={13} />
                {state.note}
              </span>
            )}
            {state.kind === "denied" && (
              <span className="text-[12.5px] text-bad">
                Zama&apos;s relayer refused: this wallet is not the one these values belong to.
              </span>
            )}
            {state.kind === "failed" && (
              <span className="text-[12.5px] text-bad">{state.error.message}</span>
            )}
            {state.kind === "locked" && (
              <span className="text-[12.5px] text-faint">
                One signature, no gas, no transaction. The number appears in this browser and nowhere else.
              </span>
            )}
            {open && (
              <span className="text-[12.5px] text-faint">
                Only this browser saw it. Nothing was written to the chain.
              </span>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}
