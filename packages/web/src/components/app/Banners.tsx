"use client";

import { sepolia } from "wagmi/chains";
import { useSwitchChain } from "wagmi";
import { Banner, Button } from "@/components/ui";
import { addressUrl, MIN_ANONYMITY_SET, txUrl } from "@/lib/chain/addresses";
import { timeAgo, shortAddress } from "@/lib/format";
import type { PoolState, SaverState, TokenLayer } from "@/hooks/useHearth";
import type { Activity } from "@/app/api/activity/route";

/**
 * Everything the saver should know before they act, in one column above the console.
 *
 * The order is deliberate: what stops the app working first, then what changes what the app
 * promises about privacy, then what is merely slow.
 */
export function Banners({
  pool,
  saver,
  token,
  activity,
  activityError,
  periodLength,
}: {
  pool: PoolState;
  saver: SaverState;
  token: TokenLayer;
  activity: Activity | null;
  activityError: string | null;
  periodLength: number;
}) {
  const { switchChain, isPending } = useSwitchChain();

  const keeper = activity?.lastKeeper ?? null;
  // A draw needs a close, an award and its evaluations inside two periods. Nothing landing for
  // longer than a period means the draws are not being advanced by anybody.
  const keeperLate = keeper !== null && keeper.secondsAgo > periodLength;
  const noKeeperAtAll = activity !== null && keeper === null;

  return (
    <div className="flex flex-col gap-2.5">
      {saver.wrongNetwork && (
        <Banner
          tone="bad"
          title="Your wallet is on the wrong network."
          action={
            <Button tone="primary" size="small" busy={isPending} onClick={() => switchChain({ chainId: sepolia.id })}>
              Switch to Sepolia
            </Button>
          }
        >
          Hearth is deployed on Ethereum Sepolia. Nothing on this page will read or write until your
          wallet is on it.
        </Banner>
      )}

      {token.blocked && (
        <Banner tone="bad" title="This address is on the token's deny list.">
          Zama&apos;s confidential USDC refuses every transfer in or out of this address, so deposits
          and withdrawals will revert. That is the token owner&apos;s setting, not ours.
        </Banner>
      )}

      {token.paused && (
        <Banner tone="bad" title="The confidential USDC token is paused.">
          Wrapping, transferring and unwrapping are all stopped at the token layer. Hearth&apos;s own
          contracts are unaffected, but nothing can move until Zama unpauses it.
        </Banner>
      )}

      {pool.vaultPaused && (
        <Banner tone="warn" title="The vault is paused.">
          New deposits and draw closing are stopped. Withdrawing, evaluation, awarding and
          finalizing are never pausable, so your money is still yours to take out.
        </Banner>
      )}

      {pool.poolPaused && !pool.vaultPaused && (
        <Banner tone="warn" title="The prize pool is paused.">
          Draws cannot be closed. Awarding, evaluation, reconciliation and withdrawals continue.
        </Banner>
      )}

      {token.observerCount > 0 && (
        <Banner tone="warn" title={`The token owner has appointed ${token.observerCount} observer${token.observerCount === 1 ? "" : "s"}.`}>
          An observer on Zama&apos;s confidential USDC can decrypt every amount that moves through the
          token, including deposits and payouts, and retroactively. Hearth&apos;s own ledger, your
          principal, winnings, weight and credit, is not readable by them.{" "}
          {token.observers.map((observer) => (
            <a
              key={observer}
              href={addressUrl(observer)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-flame/80 underline-offset-2 hover:underline"
            >
              {shortAddress(observer)}{" "}
            </a>
          ))}
        </Banner>
      )}

      {token.upgraded && (
        <Banner tone="warn" title="The confidential USDC token has been upgraded.">
          It now runs implementation {token.implementation ? shortAddress(token.implementation) : "an unknown"}, which is
          not the one whose source we read line by line. Its behaviour on Hearth&apos;s handles could
          have changed.
        </Banner>
      )}

      {pool.thinAnonymitySet && (
        <Banner tone="warn" title={`Only ${pool.savers} saver${pool.savers === 1 ? "" : "s"} in the pool right now.`}>
          Below {MIN_ANONYMITY_SET} savers the published bracket is close to personal information: with one
          saver it is that saver&apos;s weight to within a factor of two, and with two each can bound
          the other. Amounts stay encrypted either way, but the privacy is thin until more people join.
        </Banner>
      )}

      {noKeeperAtAll && (
        <Banner tone="warn" title="No draw has been advanced in the last few hours.">
          Every step of a draw is callable by anyone, and the draw panel below offers all of them.
          A stalled keeper costs draws, never money.
        </Banner>
      )}

      {keeperLate && keeper && (
        <Banner
          tone="warn"
          title={`The last draw step landed ${timeAgo(keeper.secondsAgo)}, longer than one period.`}
          action={
            <a
              href={txUrl(keeper.tx)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-flame/80 underline-offset-2 hover:underline"
            >
              See it on Etherscan
            </a>
          }
        >
          {keeper.from ? `Sent by ${shortAddress(keeper.from)}. ` : ""}Nobody has to wait for a keeper:
          the draw panel below closes, awards, evaluates, finalizes and reconciles from your own wallet.
        </Banner>
      )}

      {activityError && (
        <Banner tone="info" title="The draw history is unavailable.">
          {activityError} The live state above still comes straight from the chain.
        </Banner>
      )}
    </div>
  );
}
