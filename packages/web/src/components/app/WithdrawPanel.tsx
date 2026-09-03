"use client";

import { useState } from "react";
import { Panel, AmountField, Button, Spinner } from "@/components/ui";
import { txUrl } from "@/lib/chain/addresses";
import { formatAmount, parseAmount } from "@/lib/format";
import type { useActions } from "@/hooks/useActions";
import type { useReveal } from "@/hooks/useReveal";
import type { useUnshield } from "@/hooks/useUnshield";
import type { DrawView, HearthConfig, SaverState } from "@/hooks/useHearth";

const PROBLEMS: Record<string, string> = {
  shape: "Numbers only, with at most one decimal point.",
  precision: "USDC has six decimals, so anything finer than 0.000001 cannot be sent.",
  zero: "Enter an amount above zero.",
};

export function WithdrawPanel({
  config,
  saver,
  draws,
  reveal,
  money,
  unshield,
  refresh,
}: {
  config: HearthConfig;
  saver: SaverState;
  draws: DrawView[];
  reveal: ReturnType<typeof useReveal>;
  money: ReturnType<typeof useActions>;
  unshield: ReturnType<typeof useUnshield>;
  refresh: () => void;
}) {
  const [input, setInput] = useState("");
  const [unshieldInput, setUnshieldInput] = useState("");

  const open = reveal.state.kind === "open";
  const principal = reveal.read(saver.principalHandle);
  const winnings = reveal.read(saver.winningsHandle);
  const known = open && principal !== null && winnings !== null;
  const available = known ? principal + winnings : null;

  const amount = parseAmount(input);
  const problem = (() => {
    if (!amount.ok) return amount.reason === "empty" ? null : PROBLEMS[amount.reason];
    if (available !== null && amount.value > available) {
      return `You hold ${formatAmount(available)} USDC in the vault. Asking for more is not an error: the vault clamps to what you hold and sends all of it.`;
    }
    return null;
  })();

  const split = (() => {
    if (!known || !amount.ok || winnings === null) return null;
    const fromWinnings = amount.value < winnings ? amount.value : winnings;
    return { fromWinnings, fromPrincipal: amount.value - fromWinnings };
  })();

  const windowOpen = draws.some((draw) => draw.status === "awarded" || draw.status === "closed" || draw.status === "none");
  const disabled = !saver.connected || saver.wrongNetwork || money.busy;

  const unshieldAmount = parseAmount(unshieldInput);

  return (
    <Panel title="Withdraw" step="4" hint="principal is never locked">
      {!saver.connected ? (
        <p className="text-[14px] leading-relaxed text-muted">
          Connect a wallet to withdraw. Nothing here is locked: principal comes back in full at any
          time, including in the middle of a draw.
        </p>
      ) : !saver.isSaver ? (
        <p className="text-[14px] leading-relaxed text-muted">
          This wallet has never deposited, so there is nothing to withdraw.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <div>
            {!known && (
              <p className="mb-3 text-[12.5px] leading-relaxed text-faint">
                Reveal your balance in the panel above and this field can cap itself and show the split.
                Without it the amount is still safe to send, it is just typed blind.
              </p>
            )}

            <p className="text-[12.5px] leading-relaxed text-muted">
              Withdrawals pay from winnings first, then from principal, in one confidential transfer.
              The amount is clamped on chain to the smaller of what you hold and what the vault holds,
              because a confidential transfer moves the whole amount or nothing at all. So an over-large
              request returns everything instead of failing, and a balance cannot be probed by asking.
            </p>
            {windowOpen && (
              <p className="mt-2 text-[12.5px] leading-relaxed text-faint">
                A draw window is open. Withdrawing now is allowed and does not change the odds already
                fixed for you; any prize from that draw lands in your winnings for a later withdrawal.
              </p>
            )}

            <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-start">
              <div className="flex-1">
                <AmountField
                  value={input}
                  onChange={setInput}
                  onMax={available !== null ? () => setInput(formatAmount(available)) : undefined}
                  maxLabel="All"
                  disabled={disabled}
                  problem={problem}
                />
              </div>
              <div className="flex gap-2.5">
                <Button
                  tone="primary"
                  disabled={disabled || !amount.ok}
                  busy={money.busy && money.label === "Withdraw"}
                  onClick={() => amount.ok && money.withdraw(amount.value, () => {
                    setInput("");
                    reveal.hide();
                    refresh();
                  })}
                >
                  Withdraw
                </Button>
                <Button
                  disabled={disabled}
                  busy={money.busy && money.label === "Withdraw everything"}
                  onClick={() => money.withdrawAll(() => {
                    setInput("");
                    reveal.hide();
                    refresh();
                  })}
                >
                  All of it
                </Button>
              </div>
            </div>

            {split && (
              <p className="mt-2 text-[12.5px] tabular-nums text-faint">
                That is {formatAmount(split.fromWinnings)} from winnings and{" "}
                {formatAmount(split.fromPrincipal)} from principal, in one transfer that looks the same
                either way.
              </p>
            )}
          </div>

          <div className="border-t border-hairlineSoft pt-5">
            <p className="text-[14px] text-parchment">Unshield: unwrap back to public USDC</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
              Two transactions, because the wrapper burns the encrypted amount and publishes it first,
              then releases the plain tokens once Zama&apos;s protocol has produced the cleartext and its
              proof. The amount is public, exactly like the amount you wrapped, and it is the first
              transaction that publishes it.
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-faint">
              Worth knowing: wrap in and unwrap out in full and the difference between the two public
              totals is a lower bound on everything you have ever won. Unwrap in round numbers, or leave
              a standing confidential balance behind.
            </p>

            {unshield.pending && (
              <div className="mt-3 flex flex-col gap-2 rounded-lg border border-warn/40 bg-warn/[0.08] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12.5px] leading-relaxed text-muted">
                  An unwrap was submitted and never finalized. The tokens are burned and waiting; finishing
                  it releases them.{" "}
                  <a
                    href={txUrl(unshield.pending)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-flame/80 underline-offset-2 hover:underline"
                  >
                    See the unwrap
                  </a>
                </p>
                <Button
                  size="small"
                  tone="primary"
                  busy={unshield.busy}
                  disabled={saver.wrongNetwork}
                  onClick={() => void unshield.resume(refresh)}
                >
                  Finish it
                </Button>
              </div>
            )}

            <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-start">
              <div className="flex-1">
                <AmountField
                  value={unshieldInput}
                  onChange={setUnshieldInput}
                  disabled={!saver.connected || saver.wrongNetwork || unshield.busy}
                  problem={unshieldAmount.ok || unshieldAmount.reason === "empty" ? null : PROBLEMS[unshieldAmount.reason]}
                />
              </div>
              <Button
                disabled={!saver.connected || saver.wrongNetwork || unshield.busy || !unshieldAmount.ok || !config.asset}
                busy={unshield.busy}
                onClick={() => unshieldAmount.ok && void unshield.unshield(unshieldAmount.value, () => {
                  setUnshieldInput("");
                  refresh();
                })}
              >
                Unwrap
              </Button>
            </div>

            {unshield.stage.kind !== "idle" && (
              <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-hairlineSoft bg-[rgba(10,10,10,0.68)] px-4 py-3">
                {unshield.busy && <span className="mt-0.5"><Spinner size={14} /></span>}
                <p
                  className={`flex-1 text-[13px] leading-relaxed ${
                    unshield.stage.kind === "failed" ? "text-bad" : unshield.stage.kind === "done" ? "text-good" : "text-muted"
                  }`}
                >
                  {unshield.stage.kind === "unwrapping" && "Unwrap: confirm the first transaction in your wallet."}
                  {unshield.stage.kind === "waiting" && "Unwrap submitted. Waiting for Zama's protocol to publish the cleartext and its proof."}
                  {unshield.stage.kind === "finalizing" && "Finalizing: confirm the second transaction to release the plain USDC."}
                  {unshield.stage.kind === "done" && "Unwrapped. The plain USDC is back in your wallet."}
                  {unshield.stage.kind === "failed" && unshield.stage.error.message}
                </p>
                {(unshield.stage.kind === "done" || unshield.stage.kind === "failed") && (
                  <button
                    type="button"
                    onClick={unshield.dismiss}
                    className="text-[12px] text-faint transition-colors hover:text-parchment"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
