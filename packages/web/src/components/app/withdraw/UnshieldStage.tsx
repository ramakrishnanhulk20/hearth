"use client";

import { useState } from "react";
import {
  ActionNote,
  AmountCard,
  CARD_NOTE,
  CARD_PROSE,
  Card,
  PrimaryButton,
  ReceiveCard,
  SealedLine,
  type ActionNoteProps,
} from "@/components/app/console";
import { PROBLEMS, exactAmount } from "@/components/app/amount";
import type { TokenSymbols } from "@/components/app/useTokenSymbols";
import { formatAmount, parseAmount } from "@/lib/format";
import type { HearthConfig, SaverState } from "@/hooks/useHearth";
import type { Reveal } from "@/hooks/useReveal";
import type { useUnshield } from "@/hooks/useUnshield";

/** The wallet's own confidential USDC, which is a different balance from the one in the vault. */
const WALLET_SCOPE = "wallet-confidential";

/**
 * Stage two: confidential USDC back to the plain ERC-20.
 *
 * Two transactions and one signature, and the amount ends up on chain in the clear. The screen
 * says so before the first prompt rather than after it, because a saver who did not expect a
 * public number would have wanted to choose a different one.
 */
export function UnshieldStage({
  config,
  saver,
  reveal,
  unshield,
  symbols,
  refresh,
}: {
  config: HearthConfig;
  saver: SaverState;
  reveal: Reveal;
  unshield: ReturnType<typeof useUnshield>;
  symbols: TokenSymbols;
  refresh: () => void;
}) {
  const [input, setInput] = useState("");

  const wallet = reveal.scope(WALLET_SCOPE);
  const held = wallet.read(saver.confidentialHandle);

  const amount = parseAmount(input);
  const overHeld = amount.ok && held !== null && amount.value > held;

  const problem = (() => {
    if (!amount.ok) return amount.reason === "empty" ? null : PROBLEMS[amount.reason];
    if (overHeld && held !== null) {
      return `You hold ${formatAmount(held)} confidential USDC. Asking for more is not refused on chain: it spends both transactions and moves nothing.`;
    }
    return null;
  })();

  const ready = saver.connected && !saver.wrongNetwork;

  // One pending unshield is remembered at a time, so starting a second would leave the first
  // stranded with its tokens already burned.
  const unfinished = unshield.pending !== null;
  const blocked = !ready || unshield.busy || unfinished || !config.asset;

  const stage = unshield.stage;
  const note = ((): ActionNoteProps => {
    switch (stage.kind) {
      case "idle":
        return { tone: "working", text: null };
      case "unwrapping":
        return {
          tone: "working",
          text: "Unshield: your wallet asks twice. First for a signature so the wrapper can read your confidential balance, which costs no gas, then for the transaction itself.",
        };
      case "waiting":
        return {
          tone: "working",
          text: "Unshield submitted. Waiting for Zama's protocol to publish the cleartext and its proof.",
        };
      case "finalizing":
        return {
          tone: "working",
          text: "Finalizing: confirm the second transaction to release the plain USDC.",
        };
      case "done":
        return {
          tone: "good",
          text: "Unshielded. The plain USDC is back in your wallet.",
          hash: stage.hash,
          onDismiss: unshield.dismiss,
        };
      case "failed":
        return { tone: "bad", text: stage.error.message, onDismiss: unshield.dismiss };
    }
  })();

  return (
    <div className="flex flex-col gap-4">
      <AmountCard
        label="You unshield"
        name="Amount of confidential USDC to unshield"
        value={input}
        onChange={setInput}
        token={symbols.confidential}
        balance={
          <SealedLine
            label="In your wallet"
            spoken="your confidential USDC balance"
            scope={wallet}
            amount={held}
            disabled={!ready}
            onReveal={() => {
              if (!config.asset) return;
              wallet.reveal([{ handle: saver.confidentialHandle, contractAddress: config.asset }]);
            }}
          />
        }
        note={
          wallet.open
            ? null
            : "Reveal to cap this field. An unshield of more than you hold is not refused, it just moves nothing."
        }
        onMax={held !== null ? () => setInput(exactAmount(held)) : undefined}
        maxLabel="All of it"
        disabled={blocked}
        problem={problem}
      />

      <ReceiveCard
        label="You receive"
        token={symbols.usdc}
        value={amount.ok && !overHeld ? formatAmount(amount.value) : null}
        balance="Plain USDC in your wallet, spendable anywhere."
        note="This figure goes on chain in the clear. The first of the two transactions is what publishes it."
      />

      <PrimaryButton
        disabled={blocked || !amount.ok || overHeld}
        busy={unshield.busy}
        onClick={() =>
          amount.ok &&
          void unshield.unshield(amount.value, () => {
            setInput("");
            refresh();
          })
        }
      >
        Unshield
      </PrimaryButton>

      {unfinished && (
        <p className={CARD_NOTE}>
          A new unshield has to wait until the one above is finished. Only one is remembered at a time,
          and starting another would leave the first with its tokens burned and nothing to release them.
        </p>
      )}

      <ActionNote {...note} />

      <Card label="Why this takes two transactions">
        <div className={`space-y-3 ${CARD_PROSE}`}>
          <p>
            The wrapper burns the encrypted amount and publishes it first, then releases the plain
            tokens once Zama&apos;s protocol has produced the cleartext and its proof. Those are two
            separate calls, and the second one can be sent later if you close the tab between them.
          </p>
          <p>
            Your wallet also asks for a signature before the first transaction, because the wrapper
            reads your confidential balance to check the amount. That prompt is a signature and not a
            transaction, and it costs no gas.
          </p>
          <p>
            Worth knowing before you empty it: shield in and unshield out in full, and the difference
            between the two public totals is a lower bound on everything you have ever won. Unshield in
            round numbers, or leave a standing confidential balance behind.
          </p>
        </div>
      </Card>
    </div>
  );
}
