"use client";

import { useState } from "react";
import { Panel, AmountField, Button, SealedBars } from "@/components/ui";
import { FAUCET_AMOUNT } from "@/lib/chain/addresses";
import { formatAmount, parseAmount } from "@/lib/format";
import type { useActions } from "@/hooks/useActions";
import type { DrawView, HearthConfig, PoolState, SaverState } from "@/hooks/useHearth";

const PROBLEMS: Record<string, string> = {
  shape: "Numbers only, with at most one decimal point.",
  precision: "USDC has six decimals, so anything finer than 0.000001 cannot be sent.",
  zero: "Enter an amount above zero.",
};

/** A little Sepolia ETH is needed for gas, and no faucet of ours can provide it. */
const GAS_FLOOR = 2_000_000_000_000_000n;

export function DepositPanel({
  config,
  pool,
  saver,
  draws,
  money,
  refresh,
}: {
  config: HearthConfig;
  pool: PoolState;
  saver: SaverState;
  draws: DrawView[];
  money: ReturnType<typeof useActions>;
  refresh: () => void;
}) {
  const [wrapInput, setWrapInput] = useState("");
  const [depositInput, setDepositInput] = useState("");

  const wrapAmount = parseAmount(wrapInput);
  const depositAmount = parseAmount(depositInput);

  const wrapProblem = (() => {
    if (!wrapAmount.ok) return wrapAmount.reason === "empty" ? null : PROBLEMS[wrapAmount.reason];
    if (wrapAmount.value > saver.usdc) return `You hold ${formatAmount(saver.usdc)} USDC. Mint more below, or ask for less.`;
    return null;
  })();

  const depositProblem = (() => {
    if (!depositAmount.ok) return depositAmount.reason === "empty" ? null : PROBLEMS[depositAmount.reason];
    if (config.maxPrincipal > 0n && depositAmount.value > config.maxPrincipal) {
      return `The vault caps one saver at ${formatAmount(config.maxPrincipal)} USDC, so this would be refused and refunded inside the same transaction.`;
    }
    return null;
  })();

  const needsApproval = wrapAmount.ok && saver.allowance < wrapAmount.value;
  const hasConfidential = saver.confidentialHandle !== null;
  const lowGas = saver.connected && saver.ethBalance < GAS_FLOOR;
  const closedNotAwarded = draws.some((draw) => draw.status === "closed");
  const disabled = !saver.connected || saver.wrongNetwork || money.busy;

  return (
    <Panel title="Deposit" step="1" hint={pool.vaultPaused ? "deposits are paused" : "wrap, then deposit"}>
      {!saver.connected && (
        <p className="text-[14px] leading-relaxed text-muted">
          Connect a wallet on Sepolia to deposit. You will need a little Sepolia ETH for gas; the test
          USDC is one click away once you are connected.
        </p>
      )}

      {saver.connected && (
        <div className="flex flex-col gap-6">
          {lowGas && (
            <p className="rounded-lg border border-warn/40 bg-warn/[0.08] px-3.5 py-3 text-[12.5px] leading-relaxed text-muted">
              This wallet holds almost no Sepolia ETH, so a transaction will fail before it is sent. Any
              Sepolia faucet tops it up: the Google Cloud Web3 faucet, Alchemy&apos;s or Chainlink&apos;s.
              A tenth of an ETH is far more than enough.
            </p>
          )}

          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13px] text-faint">Test USDC in your wallet</p>
              <p className="font-display text-[18px] tabular-nums text-parchment" style={{ fontWeight: 620 }}>
                {formatAmount(saver.usdc)}
              </p>
            </div>
            <div className="mt-2.5">
              <Button
                tone={saver.usdc === 0n ? "primary" : "ghost"}
                size="small"
                disabled={disabled}
                busy={money.busy && money.label === "Get test USDC"}
                onClick={() => money.mint(FAUCET_AMOUNT, refresh)}
              >
                {saver.usdc === 0n ? "Get test USDC" : "Get a million more"}
              </Button>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-faint">
              Zama&apos;s mock USDC has an open mint capped at one million tokens a call. It is worth
              nothing, so ask for more than you need.
            </p>
          </div>

          <div className="border-t border-hairlineSoft pt-5">
            <p className="text-[14px] text-parchment">Shield: wrap USDC into confidential USDC</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
              Wrapping is public. The wrapper emits the plaintext amount, the ERC-20 transfer carries
              it again, and there is no way around that: turning a public token into a confidential one
              is by definition a public act.
            </p>
            <p className="mt-2 rounded-lg border border-flame/25 bg-flame/[0.05] px-3.5 py-3 text-[12.5px] leading-relaxed text-muted">
              This is why wrapping and depositing are two buttons and not one. Wrap a round number, at a
              time of your choosing, and deposit part of it later. Anyone who can pin your balance can
              compute whether you won in every draw from then on, because the thresholds are public by
              design.
            </p>
            <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-start">
              <div className="flex-1">
                <AmountField
                  value={wrapInput}
                  onChange={setWrapInput}
                  onMax={() => setWrapInput(formatAmount(saver.usdc))}
                  maxLabel="All"
                  disabled={disabled}
                  problem={wrapProblem}
                />
              </div>
              <div className="flex gap-2.5">
                {needsApproval ? (
                  <Button
                    tone="primary"
                    disabled={disabled || !wrapAmount.ok || wrapProblem !== null}
                    busy={money.busy && money.label === "Approve the wrapper"}
                    onClick={() => wrapAmount.ok && money.approve(wrapAmount.value, refresh)}
                  >
                    Approve
                  </Button>
                ) : (
                  <Button
                    tone="primary"
                    disabled={disabled || !wrapAmount.ok || wrapProblem !== null}
                    busy={money.busy && money.label === "Wrap into confidential USDC"}
                    onClick={() => wrapAmount.ok && money.wrap(wrapAmount.value, refresh)}
                  >
                    Wrap
                  </Button>
                )}
              </div>
            </div>
            {needsApproval && (
              <p className="mt-2 text-[12.5px] text-faint">
                The wrapper is allowed {formatAmount(saver.allowance)} USDC of yours today, which is less
                than this. Approve first, then wrap.
              </p>
            )}
          </div>

          <div className="border-t border-hairlineSoft pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[14px] text-parchment">Deposit into the pool</p>
              <span className="flex items-center gap-2 text-[12px] text-faint">
                confidential USDC held{" "}
                {hasConfidential ? <SealedBars count={4} /> : <span className="text-faint">none yet</span>}
              </span>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
              The amount is encrypted in your browser with a zero-knowledge proof, then sent in one
              transaction. The vault credits exactly what the token says actually moved, so asking for
              more than you hold moves nothing at all rather than failing loudly. Reveal your balance
              below if you are not sure.
            </p>
            {closedNotAwarded && (
              <p className="mt-2 text-[12.5px] leading-relaxed text-faint">
                A draw is closed and waiting for its award right now. Depositing is still allowed; this
                money counts from this moment on, weighted by the part of the current period that is
                still to run.
              </p>
            )}
            <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-start">
              <div className="flex-1">
                <AmountField
                  value={depositInput}
                  onChange={setDepositInput}
                  disabled={disabled || pool.vaultPaused}
                  problem={depositProblem}
                />
              </div>
              <Button
                tone="primary"
                disabled={disabled || pool.vaultPaused || !hasConfidential || !depositAmount.ok || depositProblem !== null}
                busy={money.busy && money.label === "Deposit"}
                onClick={() => depositAmount.ok && money.deposit(depositAmount.value, () => {
                  setDepositInput("");
                  refresh();
                })}
              >
                Deposit
              </Button>
            </div>
            {!hasConfidential && (
              <p className="mt-2 text-[12.5px] text-faint">Wrap some USDC first. There is nothing confidential to deposit yet.</p>
            )}
            {pool.vaultPaused && (
              <p className="mt-2 text-[12.5px] text-bad">The vault is paused, so deposits are refused. Withdrawing still works.</p>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
