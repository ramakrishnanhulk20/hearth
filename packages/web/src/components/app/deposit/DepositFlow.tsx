"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useAccount, useBalance } from "wagmi";
import {
  ActionNote,
  AmountCard,
  PageHeader,
  CARD_NOTE,
  CARD_PROSE,
  ConnectPrompt,
  INLINE_LINK,
  PrimaryButton,
  ReceiveCard,
  SealedLine,
  StepList,
  Unknown,
  usePhaseNote,
  type Step,
  type StepStatus,
} from "@/components/app/console";
import { problemText, exactAmount } from "@/components/app/amount";
import { useTokenSymbols } from "@/components/app/useTokenSymbols";
import { parseAmount } from "@/lib/format";
import { useFormat } from "@/hooks/useFormat";
import { useActions } from "@/hooks/useActions";
import { useDraws, useHearthConfig, usePoolState, useSaverState } from "@/hooks/useHearth";
import { useReveal, WALLET_SCOPE, type RevealRequest } from "@/hooks/useReveal";

/** A little Sepolia ETH is needed for gas, and no faucet of ours can provide it. */
const GAS_FLOOR = 2_000_000_000_000_000n;

/**
 * What the wrapper is approved for, once.
 *
 * Approving the exact amount every time meant two transactions on every shield, which is the one
 * thing about this flow a saver notices. The allowance reaches one contract, the confidential
 * wrapper for one token, and that token is a faucet-minted Sepolia mock with no value anywhere.
 * The screen says both of those things next to the button rather than leaving it to be found.
 */
const WRAPPER_ALLOWANCE = 2n ** 256n - 1n;

type StepKey = "faucet" | "shield" | "deposit";

/**
 * Getting money into the pool, one step at a time.
 *
 * Which step is open comes from the chain rather than from a counter: holding none of the plain
 * token means the faucet step, holding no confidential balance means the shield step. A saver can reopen a
 * finished step, and the moment their wallet says the work is done the flow moves on by itself.
 */
export function DepositFlow() {
  const t = useTranslations("deposit");
  const amountWords = useTranslations("console.amount");
  const format = useFormat();
  const phaseNote = usePhaseNote();
  const config = useHearthConfig();
  const pool = usePoolState();
  const saver = useSaverState(config);
  const { draws, refetch: refetchDraws } = useDraws(pool.period);
  const money = useActions(config);
  const reveal = useReveal();
  const symbols = useTokenSymbols(config);

  // The same query the saver state reads, so this costs no extra call. It is read again here for
  // isSuccess: a wallet whose ETH balance has not arrived must not be told it is out of gas.
  const { address } = useAccount();
  const gas = useBalance({ address, query: { enabled: saver.connected, refetchInterval: 15_000 } });

  const [wrapInput, setWrapInput] = useState("");
  const [depositInput, setDepositInput] = useState("");
  const [chosen, setChosen] = useState<StepKey | null>(null);

  const refresh = () => {
    pool.refetch();
    saver.refetch();
    refetchDraws();
  };

  // The two fields are counted in different scales: the plain token has its own decimals and the
  // confidential one has the vault's. On a one-to-one wrapper they match, and on any other they do
  // not, so each field parses against the token it is actually spending.
  const wrapAmount = parseAmount(wrapInput, config.underlyingDecimals);
  const depositAmount = parseAmount(depositInput, config.decimals);

  const plain = (value: bigint) => format.amount(value, config.underlyingDecimals);
  const sealed = (value: bigint) => format.amount(value, config.decimals);

  // Every balance below is a fallback until this is true, and a fallback is not a balance.
  const balancesKnown = saver.connected && !saver.isLoading && !saver.unavailable;

  const wrapProblem = (() => {
    if (!wrapAmount.ok) {
      return wrapAmount.reason === "empty"
        ? null
        : problemText(wrapAmount.reason, config.underlyingDecimals, symbols.underlying, amountWords);
    }
    if (balancesKnown && wrapAmount.value > saver.underlyingBalance) {
      return t("shield.tooMuch", {
        amount: plain(saver.underlyingBalance),
        underlying: symbols.underlying,
      });
    }
    return null;
  })();

  const walletScope = reveal.scope(WALLET_SCOPE);
  const walletHeld = walletScope.read(saver.confidentialHandle);

  const depositProblem = (() => {
    if (!depositAmount.ok) {
      return depositAmount.reason === "empty"
        ? null
        : problemText(depositAmount.reason, config.decimals, symbols.confidential, amountWords);
    }
    if (config.maxPrincipal > 0n && depositAmount.value > config.maxPrincipal) {
      return t("vault.cap", {
        amount: sealed(config.maxPrincipal),
        confidential: symbols.confidential,
      });
    }
    // Only when the figure is open, because that is the only moment the screen holds the balance
    // as a fact. The token moves what the wallet actually has and the vault credits that, so an
    // over-large deposit is not refused anywhere: it costs a transaction and moves nothing.
    if (walletHeld !== null && depositAmount.value > walletHeld) {
      return t("vault.tooMuch", {
        amount: sealed(walletHeld),
        confidential: symbols.confidential,
      });
    }
    return null;
  })();

  const holdsPlain = balancesKnown && saver.underlyingBalance > 0n;
  const holdsConfidential = balancesKnown && saver.confidentialHandle !== null;
  // An unread allowance is not a short allowance, so this waits for the read rather than
  // naming a figure the screen does not have.
  const needsApproval = balancesKnown && wrapAmount.ok && saver.allowance < wrapAmount.value;
  const closedNotAwarded = draws.some((draw) => draw.status === "closed");
  const lowGas = gas.isSuccess && gas.data.value < GAS_FLOOR;
  const acting = !saver.connected || saver.wrongNetwork || money.busy;

  const derived: StepKey = !holdsPlain ? "faucet" : !holdsConfidential ? "shield" : "deposit";
  const activeKey = saver.connected ? (chosen ?? derived) : null;
  const statusOf = (key: StepKey, done: boolean): StepStatus =>
    key === activeKey ? "active" : done ? "done" : "todo";

  const sealedRequests: RevealRequest[] = config.asset
    ? [{ handle: saver.confidentialHandle, contractAddress: config.asset }]
    : [];

  // One sealed figure, shown by the card you receive into and again by the card you deposit from.
  // They share a scope because they are the same value, so opening it once opens it for both.
  const walletBalance = balancesKnown ? (
    <SealedLine
      label={t("inWallet")}
      spoken={t("inWalletSpoken", { symbol: symbols.confidential })}
      scope={walletScope}
      amount={walletHeld}
      unit={symbols.confidential}
      decimals={config.decimals}
      disabled={config.asset === null || saver.wrongNetwork}
      onReveal={() => config.asset && walletScope.reveal(sealedRequests)}
    />
  ) : (
    <span>
      {t("inWalletUnknown")}
      <Unknown scale="inline" />
    </span>
  );

  const rateNote = !config.ready
    ? t("shield.rateUnknown")
    : config.rate === 1n
      ? t("shield.rateOne")
      : t("shield.rateOther", {
          rate: config.rate.toString(),
          underlying: symbols.underlying,
          confidential: symbols.confidential,
        });

  const receives =
    wrapAmount.ok && config.ready && config.rate > 0n ? sealed(wrapAmount.value / config.rate) : null;

  const steps: Step[] = [
    {
      key: "faucet",
      title: t("faucet.title", { underlying: symbols.underlying }),
      status: statusOf("faucet", holdsPlain),
      summary: (
        <>
          {t("faucet.heldSummary", {
            amount: plain(saver.underlyingBalance),
            underlying: symbols.underlying,
          })}
          <button
            type="button"
            onClick={() => money.mint(config.faucet, refresh)}
            disabled={acting}
            className={`${INLINE_LINK} disabled:opacity-50`}
          >
            {t("faucet.more")}
          </button>
        </>
      ),
      body: (
        <div className="flex flex-col gap-3.5">
          <p className={CARD_PROSE}>
            {balancesKnown
              ? t("faucet.held", {
                  amount: plain(saver.underlyingBalance),
                  underlying: symbols.underlying,
                })
              : t("faucet.unread")}
          </p>
          {/* The only step with no field above it, so the button has no column width to match and
              is capped to its own words instead. Every other primary control on this screen sits
              under a full-width amount card and lines up with it. */}
          <div className="sm:max-w-[20rem]">
            <PrimaryButton
              onClick={() => money.mint(config.faucet, refresh)}
              disabled={acting}
              busy={money.busy && money.label?.key === "mint"}
            >
              {t("faucet.button", { underlying: symbols.underlying })}
            </PrimaryButton>
          </div>
          <p className={CARD_NOTE}>{t("faucet.note", { underlying: symbols.underlying })}</p>
        </div>
      ),
    },
    {
      key: "shield",
      title: t("shield.title", { underlying: symbols.underlying }),
      status: statusOf("shield", holdsConfidential),
      summary: (
        <>
          {t("shield.summary")}
          <button type="button" onClick={() => setChosen("shield")} className={INLINE_LINK}>
            {t("shield.more")}
          </button>
        </>
      ),
      body: (
        <div className="flex flex-col gap-4">
          <p className={CARD_PROSE}>
            {t("shield.body", {
              underlying: symbols.underlying,
              confidential: symbols.confidential,
            })}
          </p>

          <AmountCard
            label={t("shield.youShield")}
            name={t("shield.fieldName", { underlying: symbols.underlying })}
            value={wrapInput}
            onChange={setWrapInput}
            token={symbols.underlying}
            onMax={
              balancesKnown
                ? () => setWrapInput(exactAmount(saver.underlyingBalance, config.underlyingDecimals))
                : undefined
            }
            maxLabel={amountWords("allOfIt")}
            disabled={acting}
            problem={wrapProblem}
            balance={
              balancesKnown ? (
                t("shield.balance", {
                  amount: plain(saver.underlyingBalance),
                  underlying: symbols.underlying,
                })
              ) : (
                <span>
                  {t("inWalletUnknown")}
                  <Unknown scale="inline" />
                </span>
              )
            }
          />

          <ReceiveCard
            label={t("shield.youReceive")}
            token={symbols.confidential}
            value={receives}
            balance={walletBalance}
            note={rateNote}
          />

          {/* An outlined tint is how the console says "status", and the low gas warning above
              already owns that shape. This is the accent speaking, so it takes the rail's ember
              treatment instead: a lit edge with the wash falling away from it. */}
          <p
            className={`rounded-e-xl border-s-2 border-s-flame bg-gradient-to-r rtl:bg-gradient-to-l from-flame/[0.12] via-flame/[0.04] to-flame/0 px-4 py-3.5 ${CARD_NOTE}`}
          >
            {t("shield.why")}
          </p>

          <PrimaryButton
            onClick={() => {
              if (!wrapAmount.ok) return;
              if (needsApproval) {
                money.approve(WRAPPER_ALLOWANCE, refresh);
                return;
              }
              money.wrap(wrapAmount.value, () => {
                setWrapInput("");
                setChosen(null);
                refresh();
              });
            }}
            disabled={acting || !balancesKnown || !wrapAmount.ok || wrapProblem !== null}
            busy={money.busy && (money.label?.key === "approve" || money.label?.key === "wrap")}
          >
            {needsApproval ? t("shield.approve") : t("shield.button")}
          </PrimaryButton>

          {needsApproval && (
            <p className={CARD_NOTE}>
              {t("shield.approveNote", {
                underlying: symbols.underlying,
                confidential: symbols.confidential,
              })}
            </p>
          )}

          {saver.connected && !balancesKnown && <p className={CARD_NOTE}>{t("shield.waiting")}</p>}

          {chosen === "shield" && holdsConfidential && (
            <button
              type="button"
              onClick={() => setChosen(null)}
              className="self-start text-[12.5px] text-muted underline-offset-2 hover:text-parchment hover:underline"
            >
              {t("shield.skip")}
            </button>
          )}
        </div>
      ),
    },
    {
      key: "deposit",
      title: t("vault.title"),
      status: statusOf("deposit", false),
      body: (
        <div className="flex flex-col gap-4">
          <p className={CARD_PROSE}>{t("vault.body")}</p>

          {closedNotAwarded && <p className={CARD_NOTE}>{t("vault.closedNotAwarded")}</p>}

          <AmountCard
            label={t("vault.youDeposit")}
            name={t("vault.fieldName", { confidential: symbols.confidential })}
            value={depositInput}
            onChange={setDepositInput}
            token={symbols.confidential}
            onMax={
              walletHeld !== null
                ? () => setDepositInput(exactAmount(walletHeld, config.decimals))
                : undefined
            }
            maxLabel={amountWords("allOfIt")}
            disabled={acting || pool.vaultPaused}
            problem={depositProblem}
            balance={walletBalance}
            note={walletHeld === null ? t("vault.sealedNote") : null}
          />

          <PrimaryButton
            onClick={() =>
              depositAmount.ok &&
              money.deposit(depositAmount.value, () => {
                setDepositInput("");
                refresh();
              })
            }
            disabled={
              acting ||
              pool.vaultPaused ||
              !holdsConfidential ||
              !depositAmount.ok ||
              depositProblem !== null
            }
            busy={money.busy && money.label?.key === "deposit"}
          >
            {t("vault.button")}
          </PrimaryButton>

          {pool.vaultPaused && (
            <p className="text-[12.5px] leading-relaxed text-bad">{t("vault.paused")}</p>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle", {
          underlying: symbols.underlying,
          confidential: symbols.confidential,
        })}
      />

      <div className="flex flex-col gap-4">
        <ConnectPrompt note={t("connectNote", { underlying: symbols.underlying })}>
          {t("connect")}
        </ConnectPrompt>

        {lowGas && (
          <p className={`panel-glare rounded-card border border-warn/45 bg-warn/[0.08] px-5 py-4 ${CARD_NOTE}`}>
            {t("lowGas")}
          </p>
        )}

        <StepList steps={steps} />

        <ActionNote {...phaseNote(money.phase, money.label, money.reset, money.blockedBy)} />
      </div>
    </>
  );
}
