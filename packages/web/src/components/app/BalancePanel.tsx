"use client";

import { Panel, Button, Figure, SealedBars, Spinner } from "@/components/ui";
import { formatAmount } from "@/lib/format";
import { BALANCE_SCOPE, type Reveal } from "@/hooks/useReveal";
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
  reveal: Reveal;
}) {
  // This panel's own scope, so opening a draw's result further down leaves it exactly as it was,
  // and sealing it again closes nothing but this panel.
  const view = reveal.scope(BALANCE_SCOPE);
  const { state, read, hide, open } = view;
  const vault = config.vault;

  const principal = read(saver.principalHandle);
  const winnings = read(saver.winningsHandle);

  const ask = () => {
    if (!vault) return;
    view.reveal([
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
      {saver.connected && !saver.isSaver ? (
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
              <Button
                tone="primary"
                size="small"
                disabled={!saver.connected || saver.wrongNetwork}
                busy={state.kind === "working"}
                onClick={ask}
              >
                Reveal
              </Button>
            )}

            {!saver.connected && (
              <span className="text-[12.5px] leading-relaxed text-faint">
                Connect a wallet to open your own. Nobody else can, and that is enforced by
                Zama&apos;s access control list on chain rather than promised by this page.
              </span>
            )}

            {saver.connected && state.kind === "working" && (
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
            {saver.connected && state.kind === "locked" && (
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
