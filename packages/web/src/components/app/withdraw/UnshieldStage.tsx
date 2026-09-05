"use client";

import { useTranslations } from "next-intl";
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
import { problemText, exactAmount } from "@/components/app/amount";
import type { TokenSymbols } from "@/components/app/useTokenSymbols";
import { parseAmount } from "@/lib/format";
import { useFormat } from "@/hooks/useFormat";
import { useErrorText } from "@/hooks/useErrorText";
import type { HearthConfig, SaverState } from "@/hooks/useHearth";
import { WALLET_SCOPE, type Reveal } from "@/hooks/useReveal";
import type { useUnshield } from "@/hooks/useUnshield";

/**
 * Stage two: the confidential token back to the plain ERC-20.
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
  const t = useTranslations("withdraw.unshield");
  const amountWords = useTranslations("console.amount");
  const format = useFormat();
  const errorText = useErrorText();
  const [input, setInput] = useState("");

  const wallet = reveal.scope(WALLET_SCOPE);
  const held = wallet.read(saver.confidentialHandle);

  const amount = parseAmount(input, config.decimals);
  const overHeld = amount.ok && held !== null && amount.value > held;

  const problem = (() => {
    if (!amount.ok) {
      return amount.reason === "empty"
        ? null
        : problemText(amount.reason, config.decimals, symbols.confidential, amountWords);
    }
    if (overHeld && held !== null) {
      return t("tooMuch", {
        amount: format.amount(held, config.decimals),
        confidential: symbols.confidential,
      });
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
        return { tone: "working", text: t("unwrapping") };
      case "waiting":
        return { tone: "working", text: t("waiting") };
      case "finalizing":
        return { tone: "working", text: t("finalizing", { underlying: symbols.underlying }) };
      case "done":
        // The transaction succeeded either way. Whether any money moved is a different question,
        // and the wrapper answers it by releasing nothing when the ask was above the balance.
        if (stage.moved === 0n) {
          return {
            tone: "bad",
            text: t("nothingMoved", { underlying: symbols.underlying }),
            hash: stage.hash,
            onDismiss: unshield.dismiss,
          };
        }
        return {
          tone: "good",
          text:
            stage.moved === null
              ? t("doneUnchecked", { underlying: symbols.underlying })
              : t("done", {
                  underlying: symbols.underlying,
                  amount: format.amount(stage.moved, config.underlyingDecimals),
                }),
          hash: stage.hash,
          onDismiss: unshield.dismiss,
        };
      case "failed":
        return { tone: "bad", text: errorText(stage.error), onDismiss: unshield.dismiss };
    }
  })();

  return (
    <div className="flex flex-col gap-4">
      <AmountCard
        label={t("youUnshield")}
        name={t("fieldName", { confidential: symbols.confidential })}
        value={input}
        onChange={setInput}
        token={symbols.confidential}
        balance={
          <SealedLine
            label={t("inWallet")}
            spoken={t("inWalletSpoken", { confidential: symbols.confidential })}
            scope={wallet}
            amount={held}
            unit={symbols.confidential}
            decimals={config.decimals}
            disabled={!ready}
            onReveal={() => {
              if (!config.asset) return;
              wallet.reveal([{ handle: saver.confidentialHandle, contractAddress: config.asset }]);
            }}
          />
        }
        note={wallet.open ? null : t("revealNote")}
        onMax={held !== null ? () => setInput(exactAmount(held, config.decimals)) : undefined}
        maxLabel={amountWords("allOfIt")}
        disabled={blocked}
        problem={problem}
      />

      <ReceiveCard
        label={t("youReceive")}
        token={symbols.underlying}
        value={amount.ok && !overHeld ? format.amount(amount.value, config.decimals) : null}
        balance={t("receiveBalance", { underlying: symbols.underlying })}
        note={t("receiveNote")}
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
        {t("button")}
      </PrimaryButton>

      {unfinished && <p className={CARD_NOTE}>{t("unfinished")}</p>}

      <ActionNote {...note} />

      <Card label={t("whyLabel")}>
        <div className={`space-y-3 ${CARD_PROSE}`}>
          <p>{t("whyOne")}</p>
          <p>{t("whyTwo")}</p>
          <p>{t("whyThree")}</p>
        </div>
      </Card>
    </div>
  );
}
