"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ActionNote,
  AmountCard,
  CARD_NOTE,
  CARD_PROSE,
  Card,
  INLINE_LINK,
  PrimaryButton,
  ReceiveCard,
  SealedLine,
  phaseNote,
} from "@/components/app/console";
import { PROBLEMS, exactAmount } from "@/components/app/amount";
import type { TokenSymbols } from "@/components/app/useTokenSymbols";
import { formatAmount, parseAmount } from "@/lib/format";
import type { useActions } from "@/hooks/useActions";
import type { HearthConfig, SaverState } from "@/hooks/useHearth";
import { BALANCE_SCOPE, type Reveal } from "@/hooks/useReveal";

/**
 * Stage one: principal and winnings out of the vault and into confidential USDC.
 *
 * The screen asks for a reveal before it does anything clever, because both useful things it can
 * say need the cleartext: the cap on the field, and which part of the payment comes out of
 * winnings. Neither is required to send. The vault clamps on chain, so a saver who would rather
 * not decrypt anything can still type a number or empty the whole balance in one call.
 */
export function VaultStage({
  config,
  saver,
  reveal,
  money,
  symbols,
  windowOpen,
  refresh,
}: {
  config: HearthConfig;
  saver: SaverState;
  reveal: Reveal;
  money: ReturnType<typeof useActions>;
  symbols: TokenSymbols;
  /** True while a draw is between its period ending and its prizes being credited. */
  windowOpen: boolean;
  refresh: () => void;
}) {
  const [input, setInput] = useState("");

  // The same scope the dashboard opens, because it is the same two values. Opening either one
  // covers both, and a withdrawal seals it again rather than leaving a stale figure on screen.
  const balance = reveal.scope(BALANCE_SCOPE);
  const principal = balance.read(saver.principalHandle);
  const winnings = balance.read(saver.winningsHandle);
  const available = balance.open && principal !== null && winnings !== null ? principal + winnings : null;

  const amount = parseAmount(input);
  const problem = !amount.ok && amount.reason !== "empty" ? PROBLEMS[amount.reason] : null;

  // What the vault would actually send. An over-large ask is not an error and is not refused, so
  // it is shown as the clamped figure before it is sent rather than explained afterwards.
  const sending = !amount.ok ? null : available !== null && amount.value > available ? available : amount.value;
  const clamped = amount.ok && sending !== null && sending < amount.value;

  const split = (() => {
    if (sending === null || winnings === null || !balance.open) return null;
    const fromWinnings = sending < winnings ? sending : winnings;
    return { fromWinnings, fromPrincipal: sending - fromWinnings };
  })();

  const ready = saver.connected && !saver.wrongNetwork;
  const blocked = !ready || money.busy;

  const settle = () => {
    setInput("");
    // Both handles change with the withdrawal, so the balance seals rather than showing what was
    // true a block ago.
    balance.hide();
    refresh();
  };

  if (saver.isLoading || saver.unavailable) {
    return (
      <Card>
        <p className={CARD_PROSE}>
          {saver.unavailable
            ? "The reads for this wallet did not come back, so this screen cannot say what the vault holds for you. Reload once the network is answering."
            : "Reading what this wallet holds in the vault."}
        </p>
      </Card>
    );
  }

  if (!saver.isSaver) {
    return (
      <Card>
        <p className={CARD_PROSE}>
          This wallet has never deposited, so the vault holds nothing for it and a withdrawal would be
          refused on chain.{" "}
          <Link href="/app/deposit" className={INLINE_LINK}>
            Deposit first
          </Link>
          , or use stage two if you are holding confidential USDC you want back as plain USDC.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AmountCard
        label="You withdraw"
        name="Amount to withdraw from the vault"
        value={input}
        onChange={setInput}
        token={symbols.confidential}
        balance={
          <SealedLine
            label="In the vault"
            spoken="your vault balance"
            scope={balance}
            amount={available}
            disabled={!ready}
            onReveal={() => {
              if (!config.vault) return;
              balance.reveal([
                { handle: saver.principalHandle, contractAddress: config.vault },
                { handle: saver.winningsHandle, contractAddress: config.vault },
              ]);
            }}
          />
        }
        note={
          clamped && available !== null
            ? `That is more than you hold. The vault sends the ${formatAmount(available)} you hold and stops there.`
            : !balance.open
              ? "Reveal to cap this field and see the split. Skipping it is safe: the vault clamps the amount on chain either way."
              : null
        }
        onMax={available !== null ? () => setInput(exactAmount(available)) : undefined}
        maxLabel="All of it"
        disabled={blocked}
        problem={problem}
      />

      <ReceiveCard
        label="You receive"
        token={symbols.confidential}
        value={sending === null ? null : formatAmount(sending)}
        balance="In your wallet, still encrypted. Stage two turns it back into plain USDC."
        note={
          split
            ? `${formatAmount(split.fromWinnings)} of that comes out of winnings and ${formatAmount(split.fromPrincipal)} out of principal, in one transfer that looks the same either way.`
            : "Reveal your vault balance to see how this splits between winnings and principal."
        }
      />

      <div className="flex flex-col gap-3">
        <PrimaryButton
          disabled={blocked || !amount.ok}
          busy={money.busy && money.label === "Withdraw"}
          onClick={() => amount.ok && money.withdraw(amount.value, settle)}
        >
          Withdraw
        </PrimaryButton>

        <PrimaryButton
          tone="quiet"
          disabled={blocked}
          busy={money.busy && money.label === "Withdraw everything"}
          onClick={() => money.withdrawAll(settle)}
        >
          Withdraw everything
        </PrimaryButton>
      </div>

      <p className={CARD_NOTE}>
        Withdrawing everything needs no reveal and no encrypted input. The vault adds your principal to
        your winnings on chain and sends the total, so neither you nor this page has to know it first.
      </p>

      <ActionNote {...phaseNote(money.phase, money.label, money.reset)} />

      <Card label="How a withdrawal is paid">
        <div className={`space-y-3 ${CARD_PROSE}`}>
          <p>
            Winnings go first, then principal, in one confidential transfer. Nothing about the transfer
            says which parts it was made of.
          </p>
          <p>
            The amount is clamped on chain to the smallest of what you ask for, what you hold, and what
            the vault holds, because a confidential transfer moves the whole amount or nothing at all.
            An over-large request sends everything you hold instead of failing, which is also why nobody
            can find your balance by asking for too much and watching what happens.
          </p>
          {windowOpen && (
            <p>
              A draw window is open right now. Withdrawing is allowed and does not change the odds
              already fixed for you. Any prize from that draw lands in your winnings, for a later
              withdrawal.
            </p>
          )}
          <p>
            Principal is never locked. There is no notice period, no penalty and no waiting for a draw
            to end.
          </p>
        </div>
      </Card>
    </div>
  );
}
