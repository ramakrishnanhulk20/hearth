"use client";

import { useState } from "react";
import { useAccount, useBalance } from "wagmi";
import {
  ActionNote,
  AmountCard,
  CARD_NOTE,
  CARD_PROSE,
  ConnectPrompt,
  INLINE_LINK,
  PrimaryButton,
  ReceiveCard,
  SealedLine,
  StepList,
  Unknown,
  phaseNote,
  type Step,
  type StepStatus,
} from "@/components/app/console";
import { PROBLEMS, exactAmount } from "@/components/app/amount";
import { useTokenSymbols } from "@/components/app/useTokenSymbols";
import { FAUCET_AMOUNT } from "@/lib/chain/addresses";
import { formatAmount, parseAmount } from "@/lib/format";
import { useActions } from "@/hooks/useActions";
import { useDraws, useHearthConfig, usePoolState, useSaverState } from "@/hooks/useHearth";
import { useReveal, type RevealRequest } from "@/hooks/useReveal";

/** A little Sepolia ETH is needed for gas, and no faucet of ours can provide it. */
const GAS_FLOOR = 2_000_000_000_000_000n;

/**
 * The confidential USDC sitting in the wallet, opened on its own.
 *
 * It is a different contract and a different question from the principal and winnings the other
 * screens open, so revealing it here leaves those sealed.
 */
const WALLET_SCOPE = "deposit:wallet";

type StepKey = "usdc" | "shield" | "deposit";

/**
 * Getting money into the pool, one step at a time.
 *
 * Which step is open comes from the chain rather than from a counter: holding no USDC means the
 * faucet step, holding no confidential balance means the shield step. A saver can reopen a
 * finished step, and the moment their wallet says the work is done the flow moves on by itself.
 */
export function DepositFlow() {
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

  const wrapAmount = parseAmount(wrapInput);
  const depositAmount = parseAmount(depositInput);

  // Every balance below is a fallback until this is true, and a fallback is not a balance.
  const balancesKnown = saver.connected && !saver.isLoading && !saver.unavailable;

  const wrapProblem = (() => {
    if (!wrapAmount.ok) return wrapAmount.reason === "empty" ? null : PROBLEMS[wrapAmount.reason];
    if (balancesKnown && wrapAmount.value > saver.usdc) {
      return `You hold ${formatAmount(saver.usdc)} USDC. Ask for less, or mint more test USDC first.`;
    }
    return null;
  })();

  const depositProblem = (() => {
    if (!depositAmount.ok) return depositAmount.reason === "empty" ? null : PROBLEMS[depositAmount.reason];
    if (config.maxPrincipal > 0n && depositAmount.value > config.maxPrincipal) {
      return `The vault caps one saver at ${formatAmount(config.maxPrincipal)} USDC, so this would be refused and refunded inside the same transaction.`;
    }
    return null;
  })();

  const holdsUsdc = balancesKnown && saver.usdc > 0n;
  const holdsConfidential = balancesKnown && saver.confidentialHandle !== null;
  // An unread allowance is not a short allowance, so this waits for the read rather than
  // naming a figure the screen does not have.
  const needsApproval = balancesKnown && wrapAmount.ok && saver.allowance < wrapAmount.value;
  const closedNotAwarded = draws.some((draw) => draw.status === "closed");
  const lowGas = gas.isSuccess && gas.data.value < GAS_FLOOR;
  const acting = !saver.connected || saver.wrongNetwork || money.busy;

  const derived: StepKey = !holdsUsdc ? "usdc" : !holdsConfidential ? "shield" : "deposit";
  const activeKey = saver.connected ? (chosen ?? derived) : null;
  const statusOf = (key: StepKey, done: boolean): StepStatus =>
    key === activeKey ? "active" : done ? "done" : "todo";

  const walletScope = reveal.scope(WALLET_SCOPE);
  const walletHeld = walletScope.read(saver.confidentialHandle);
  const sealedRequests: RevealRequest[] = config.asset
    ? [{ handle: saver.confidentialHandle, contractAddress: config.asset }]
    : [];

  // One sealed figure, shown by the card you receive into and again by the card you deposit from.
  // They share a scope because they are the same value, so opening it once opens it for both.
  const walletBalance = balancesKnown ? (
    <SealedLine
      label="In your wallet"
      spoken="your confidential USDC balance"
      scope={walletScope}
      amount={walletHeld}
      disabled={config.asset === null || saver.wrongNetwork}
      onReveal={() => config.asset && walletScope.reveal(sealedRequests)}
    />
  ) : (
    <span>
      In your wallet: <Unknown scale="inline" />
    </span>
  );

  const rateNote = !config.ready
    ? "The wrapper rate has not come back from the chain yet."
    : config.rate === 1n
      ? "The wrapper is one to one, so you receive exactly what you shield."
      : `The wrapper takes ${config.rate.toString()} units of USDC for one unit of confidential USDC.`;

  const receives =
    wrapAmount.ok && config.ready && config.rate > 0n ? formatAmount(wrapAmount.value / config.rate) : null;

  const steps: Step[] = [
    {
      key: "usdc",
      title: "Get test USDC",
      status: statusOf("usdc", holdsUsdc),
      summary: (
        <>
          {`${formatAmount(saver.usdc)} USDC in your wallet. `}
          <button
            type="button"
            onClick={() => money.mint(FAUCET_AMOUNT, refresh)}
            disabled={acting}
            className={`${INLINE_LINK} disabled:opacity-50`}
          >
            Get a million more
          </button>
        </>
      ),
      body: (
        <div className="flex flex-col gap-3.5">
          <p className={CARD_PROSE}>
            {balancesKnown
              ? `${formatAmount(saver.usdc)} USDC in your wallet.`
              : "Your wallet balance has not come back from the chain yet."}
          </p>
          {/* The only step with no field above it, so the button has no column width to match and
              is capped to its own words instead. Every other primary control on this screen sits
              under a full-width amount card and lines up with it. */}
          <div className="sm:max-w-[20rem]">
            <PrimaryButton
              onClick={() => money.mint(FAUCET_AMOUNT, refresh)}
              disabled={acting}
              busy={money.busy && money.label === "Get test USDC"}
            >
              Get test USDC
            </PrimaryButton>
          </div>
          <p className={CARD_NOTE}>
            Zama&apos;s mock USDC has an open mint capped at one million tokens a call. It is worth
            nothing, so ask for more than you need.
          </p>
        </div>
      ),
    },
    {
      key: "shield",
      title: "Shield your USDC",
      status: statusOf("shield", holdsConfidential),
      summary: (
        <>
          Shielded. The balance is sealed, so only you can read what is in it.{" "}
          <button type="button" onClick={() => setChosen("shield")} className={INLINE_LINK}>
            Shield more
          </button>
        </>
      ),
      body: (
        <div className="flex flex-col gap-4">
          <p className={CARD_PROSE}>
            Shielding wraps plain USDC into the confidential kind, and it is public. The wrapper emits
            the plaintext amount, the ERC-20 transfer carries it again, and there is no way around
            that: turning a public token into a confidential one is by definition a public act.
          </p>

          <AmountCard
            label="You shield"
            name="Amount of USDC to shield"
            value={wrapInput}
            onChange={setWrapInput}
            token={symbols.usdc}
            onMax={balancesKnown ? () => setWrapInput(exactAmount(saver.usdc)) : undefined}
            maxLabel="All of it"
            disabled={acting}
            problem={wrapProblem}
            balance={
              balancesKnown ? (
                `${formatAmount(saver.usdc)} USDC in your wallet`
              ) : (
                <span>
                  In your wallet: <Unknown scale="inline" />
                </span>
              )
            }
          />

          <ReceiveCard
            label="You receive"
            token={symbols.confidential}
            value={receives}
            balance={walletBalance}
            note={rateNote}
          />

          {/* An outlined tint is how the console says "status", and the low gas warning above
              already owns that shape. This is the accent speaking, so it takes the rail's ember
              treatment instead: a lit edge with the wash falling away from it. */}
          <p
            className={`rounded-r-xl border-l-2 border-l-flame bg-gradient-to-r from-flame/[0.12] via-flame/[0.04] to-flame/0 px-4 py-3.5 ${CARD_NOTE}`}
          >
            This is why shielding and depositing are two buttons and not one. Shield a round number, at
            a time of your choosing, and deposit part of it later. Anyone who can pin your balance can
            compute whether you won in every draw from then on, because the thresholds are public by
            design.
          </p>

          <PrimaryButton
            onClick={() => {
              if (!wrapAmount.ok) return;
              if (needsApproval) {
                money.approve(wrapAmount.value, refresh);
                return;
              }
              money.wrap(wrapAmount.value, () => {
                setWrapInput("");
                setChosen(null);
                refresh();
              });
            }}
            disabled={acting || !balancesKnown || !wrapAmount.ok || wrapProblem !== null}
            busy={
              money.busy &&
              (money.label === "Approve the wrapper" || money.label === "Wrap into confidential USDC")
            }
          >
            {needsApproval ? "Approve the wrapper" : "Shield"}
          </PrimaryButton>

          {needsApproval && (
            <p className={CARD_NOTE}>
              The wrapper is allowed {formatAmount(saver.allowance)} USDC of yours today, which is less
              than this. Approve first, then shield: two signatures, and the shield button takes over
              once the approval is mined.
            </p>
          )}

          {saver.connected && !balancesKnown && (
            <p className={CARD_NOTE}>
              Your balances have not come back from the chain yet, so this is held until they do.
            </p>
          )}

          {chosen === "shield" && holdsConfidential && (
            <button
              type="button"
              onClick={() => setChosen(null)}
              className="self-start text-[12.5px] text-muted underline-offset-2 hover:text-parchment hover:underline"
            >
              Deposit what you already hold instead
            </button>
          )}
        </div>
      ),
    },
    {
      key: "deposit",
      title: "Deposit into the vault",
      status: statusOf("deposit", false),
      body: (
        <div className="flex flex-col gap-4">
          <p className={CARD_PROSE}>
            The amount is encrypted in your browser with a zero-knowledge proof, then sent in one
            transaction. The vault credits exactly what the token says actually moved, so asking for
            more than you hold moves nothing at all rather than failing loudly. Open the eye below if
            you are not sure what you have.
          </p>

          {closedNotAwarded && (
            <p className={CARD_NOTE}>
              A draw is closed and waiting for its award right now. Depositing is still allowed; this
              money counts from this moment on, weighted by the part of the current period that is
              still to run.
            </p>
          )}

          <AmountCard
            label="You deposit"
            name="Amount of confidential USDC to deposit"
            value={depositInput}
            onChange={setDepositInput}
            token={symbols.confidential}
            onMax={walletHeld !== null ? () => setDepositInput(exactAmount(walletHeld)) : undefined}
            maxLabel="All of it"
            disabled={acting || pool.vaultPaused}
            problem={depositProblem}
            balance={walletBalance}
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
            busy={money.busy && money.label === "Deposit"}
          >
            Deposit
          </PrimaryButton>

          {pool.vaultPaused && (
            <p className="text-[12.5px] leading-relaxed text-bad">
              The vault is paused, so deposits are refused. Withdrawing still works.
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <ConnectPrompt note="You will need a little Sepolia ETH for gas. The test USDC is one click away once you are connected.">
        Connect a wallet on Sepolia to deposit. The three steps below are what getting money into the
        pool takes, and the screen opens whichever one your wallet is actually up to.
      </ConnectPrompt>

      {lowGas && (
        <p className={`panel-glare rounded-card border border-warn/45 bg-warn/[0.08] px-5 py-4 ${CARD_NOTE}`}>
          This wallet holds almost no Sepolia ETH, so a transaction will fail before it is sent. Any
          Sepolia faucet tops it up: the Google Cloud Web3 faucet, Alchemy&apos;s or Chainlink&apos;s.
          A tenth of an ETH is far more than enough.
        </p>
      )}

      <StepList steps={steps} />

      <ActionNote {...phaseNote(money.phase, money.label, money.reset)} />
    </div>
  );
}
