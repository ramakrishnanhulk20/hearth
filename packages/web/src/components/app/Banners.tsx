"use client";

import { useTranslations } from "next-intl";
import { sepolia } from "wagmi/chains";
import { useSwitchChain } from "wagmi";
import { Banner, Button } from "@/components/ui";
import { addressUrl, MIN_ANONYMITY_SET, txUrl } from "@/lib/chain/addresses";
import { shortAddress } from "@/lib/format";
import { useFormat } from "@/hooks/useFormat";
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
  symbol,
  activity,
  activityError,
  periodLength,
}: {
  pool: PoolState;
  saver: SaverState;
  token: TokenLayer;
  /** The confidential token this console is on, so a warning names the token it is about. */
  symbol: string;
  activity: Activity | null;
  activityError: string | null;
  periodLength: number;
}) {
  const t = useTranslations("console.banners");
  const format = useFormat();
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
          title={t("wrongNetwork")}
          action={
            <Button tone="primary" size="small" busy={isPending} onClick={() => switchChain({ chainId: sepolia.id })}>
              {t("switch")}
            </Button>
          }
        >
          {t("wrongNetworkBody")}
        </Banner>
      )}

      {/* Every token banner below is drawn from the token's own reads, and all of them go quiet
          when those reads fail. Silence there looks exactly like a clean token, so the failure
          gets a line of its own rather than nothing. */}
      {token.unread && (
        <Banner tone="info" title={t("tokenUnread")}>
          {t("tokenUnreadBody", { symbol })}
        </Banner>
      )}

      {token.blocked && (
        <Banner tone="bad" title={t("denied")}>
          {t("deniedBody", { symbol })}
        </Banner>
      )}

      {token.paused && (
        <Banner tone="bad" title={t("tokenPaused", { symbol })}>
          {t("tokenPausedBody")}
        </Banner>
      )}

      {pool.vaultPaused && (
        <Banner tone="warn" title={t("vaultPaused")}>
          {t("vaultPausedBody")}
        </Banner>
      )}

      {pool.poolPaused && !pool.vaultPaused && (
        <Banner tone="warn" title={t("poolPaused")}>
          {t("poolPausedBody")}
        </Banner>
      )}

      {token.observerCount > 0 && (
        <Banner
          tone="warn"
          title={t("observers", {
            count: token.observerCount,
            shown: format.count(token.observerCount),
          })}
        >
          {t("observersBody", { symbol })}{" "}
          {token.observers.map((observer) => (
            <a
              key={observer}
              href={addressUrl(observer)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-flameInk underline-offset-2 hover:underline"
            >
              {shortAddress(observer)}{" "}
            </a>
          ))}
        </Banner>
      )}

      {token.upgraded && (
        <Banner tone="warn" title={t("upgraded", { symbol })}>
          {t("upgradedBody", {
            implementation: token.implementation
              ? shortAddress(token.implementation)
              : t("unknownImplementation"),
          })}
        </Banner>
      )}

      {pool.thinAnonymitySet && (
        <Banner tone="warn" title={t("thinSet", { count: pool.savers, shown: format.count(pool.savers) })}>
          {t("thinSetBody", { minimum: MIN_ANONYMITY_SET })}
        </Banner>
      )}

      {noKeeperAtAll && (
        <Banner tone="warn" title={t("noKeeper")}>
          {t("noKeeperBody")}
        </Banner>
      )}

      {keeperLate && keeper && (
        <Banner
          tone="warn"
          title={t("keeperLate", { ago: format.timeAgo(keeper.secondsAgo) })}
          action={
            <a
              href={txUrl(keeper.tx)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-flameInk underline-offset-2 hover:underline"
            >
              {t("keeperLink")}
            </a>
          }
        >
          {keeper.from ? t("keeperLateFrom", { address: shortAddress(keeper.from) }) : ""}
          {t("keeperLateBody")}
        </Banner>
      )}

      {activityError && (
        <Banner tone="info" title={t("historyDown")}>
          {t("historyDownBody", { detail: activityError })}
        </Banner>
      )}
    </div>
  );
}
