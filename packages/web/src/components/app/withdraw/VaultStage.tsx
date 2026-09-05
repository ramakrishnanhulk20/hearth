"use client";

import { useTranslations } from "next-intl";
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
  usePhaseNote,
} from "@/components/app/console";
import { problemText, exactAmount } from "@/components/app/amount";
import type { TokenSymbols } from "@/components/app/useTokenSymbols";
import { Link } from "@/i18n/navigation";
import { parseAmount } from "@/lib/format";
import { useFormat } from "@/hooks/useFormat";
import type { useActions } from "@/hooks/useActions";
import type { HearthConfig, SaverState } from "@/hooks/useHearth";
import { BALANCE_SCOPE, type Reveal } from "@/hooks/useReveal";

/**
 * Stage one: principal and winnings out of the vault and back into the confidential token.
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
  const t = useTranslations("withdraw.vault");
  const amountWords = useTranslations("console.amount");
  const format = useFormat();
  const phaseNote = usePhaseNote();
  const [input, setInput] = useState("");

  // The same scope the dashboard opens, because it is the same two values. Opening either one
  // covers both, and a withdrawal seals it again rather than leaving a stale figure on screen.
  const balance = reveal.scope(BALANCE_SCOPE);
  const principal = balance.read(saver.principalHandle);
  const winnings = balance.read(saver.winningsHandle);
  const available = balance.open && principal !== null && winnings !== null ? principal + winnings : null;

  const amount = parseAmount(input, config.decimals);
  const problem =
    !amount.ok && amount.reason !== "empty"
      ? problemText(amount.reason, config.decimals, symbols.confidential, amountWords)
      : null;

  const written = (value: bigint) => format.amount(value, config.decimals);

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
        <p className={CARD_PROSE}>{saver.unavailable ? t("unavailable") : t("reading")}</p>
      </Card>
    );
  }

  if (!saver.isSaver) {
    return (
      <Card>
        <p className={CARD_PROSE}>
          {t("neverDepositedLead")}
          <Link href={`/app/${config.slug}/deposit`} className={INLINE_LINK}>
            {t("depositFirst")}
          </Link>
          {t("neverDepositedTail", {
            confidential: symbols.confidential,
            underlying: symbols.underlying,
          })}
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AmountCard
        label={t("youWithdraw")}
        name={t("fieldName")}
        value={input}
        onChange={setInput}
        token={symbols.confidential}
        balance={
          <SealedLine
            label={t("inVault")}
            spoken={t("inVaultSpoken")}
            scope={balance}
            amount={available}
            unit={symbols.confidential}
            decimals={config.decimals}
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
            ? t("clamped", { amount: written(available) })
            : !balance.open
              ? t("revealNote")
              : null
        }
        onMax={available !== null ? () => setInput(exactAmount(available, config.decimals)) : undefined}
        maxLabel={amountWords("allOfIt")}
        disabled={blocked}
        problem={problem}
      />

      <ReceiveCard
        label={t("youReceive")}
        token={symbols.confidential}
        value={sending === null ? null : written(sending)}
        balance={t("receiveBalance", { underlying: symbols.underlying })}
        note={
          split
            ? t("split", {
                winnings: written(split.fromWinnings),
                principal: written(split.fromPrincipal),
              })
            : t("splitSealed")
        }
      />

      <div className="flex flex-col gap-3">
        <PrimaryButton
          disabled={blocked || !amount.ok}
          busy={money.busy && money.label?.key === "withdraw"}
          onClick={() => amount.ok && money.withdraw(amount.value, settle)}
        >
          {t("button")}
        </PrimaryButton>

        <PrimaryButton
          tone="quiet"
          disabled={blocked}
          busy={money.busy && money.label?.key === "withdrawAll"}
          onClick={() => money.withdrawAll(settle)}
        >
          {t("everything")}
        </PrimaryButton>
      </div>

      <p className={CARD_NOTE}>{t("everythingNote")}</p>

      <ActionNote {...phaseNote(money.phase, money.label, money.reset, money.blockedBy)} />

      <Card label={t("howLabel")}>
        <div className={`space-y-3 ${CARD_PROSE}`}>
          <p>{t("howOne")}</p>
          <p>{t("howTwo")}</p>
          {windowOpen && <p>{t("howWindow")}</p>}
          <p>{t("howThree")}</p>
        </div>
      </Card>
    </div>
  );
}
