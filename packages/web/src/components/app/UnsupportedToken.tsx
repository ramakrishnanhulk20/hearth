"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { addressUrl, ZAMA_TOKEN_LIST } from "@/lib/chain/addresses";
import { OPEN_POOLS } from "@/lib/chain/pools";
import { shortAddress } from "@/lib/format";
import { usePoolReason } from "@/hooks/usePoolReason";
import { CARD_NOTE, CARD_PROSE, Card, CardPill, PageHeader } from "./console";
import { PoolPicker } from "./PoolPicker";
import { useCurrentPool } from "./PoolProvider";

/**
 * What a token Hearth cannot use looks like.
 *
 * It is the whole screen and not a banner over a working one: there is no balance to show, no
 * amount to type and no transaction to offer, and a deposit button that reverts would be worse
 * than no button. The token is still named, still linked, and the reason is the token issuer's
 * rather than ours, so the page says whose it is.
 */
export function UnsupportedToken() {
  const t = useTranslations("console.unsupported");
  const pool = useCurrentPool();
  const say = usePoolReason();
  const reason = pool.status === "restricted" ? say(pool.reason) : t("notDeployed");

  return (
    <>
      <PageHeader
        title={pool.symbol}
        subtitle={t("subtitle")}
        right={<CardPill tone="warn">{t("pill")}</CardPill>}
      />

      <div className="flex flex-col gap-4">
        <Card label={t("whyLabel")}>
          <div className={`flex max-w-[70ch] flex-col gap-3 ${CARD_PROSE}`}>
            <p>{t("whyOne")}</p>
            <p>{t("whyTwo", { name: pool.name })}</p>
          </div>

          <dl className="mt-5 grid gap-x-8 gap-y-3 border-t border-hairlineSoft pt-4 sm:grid-cols-2">
            <Line label={t("reason")} value={reason} />
            <Line
              label={t("confidentialToken")}
              value={
                <a
                  href={addressUrl(pool.asset)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-flameInk underline-offset-2 hover:underline"
                >
                  {shortAddress(pool.asset)}
                </a>
              }
            />
            <Line
              label={t("underlying")}
              value={
                <a
                  href={addressUrl(pool.underlying)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-flameInk underline-offset-2 hover:underline"
                >
                  {shortAddress(pool.underlying)}
                </a>
              }
            />
            <Line
              label={t("publishedBy")}
              value={
                <a
                  href={ZAMA_TOKEN_LIST}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-flameInk underline-offset-2 hover:underline"
                >
                  {t("zamaList")}
                </a>
              }
            />
          </dl>
        </Card>

        <Card label={t("pickLabel")}>
          <div className="max-w-[22rem]">
            <PoolPicker compact />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {OPEN_POOLS.map((entry) => (
              <Link
                key={entry.slug}
                href={`/app/${entry.slug}`}
                className="rounded-lg border border-hairline px-3.5 py-2 text-[13px] text-muted transition-colors hover:border-flame/45 hover:bg-flame/[0.08] hover:text-flameInk"
              >
                {entry.symbol}
              </Link>
            ))}
          </div>

          <p className={`mt-5 ${CARD_NOTE}`}>{t("pickNote")}</p>
        </Card>
      </div>
    </>
  );
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[12.5px] text-faint">{label}</dt>
      <dd className="min-w-0 truncate text-end text-[13px] text-parchment">{value}</dd>
    </div>
  );
}
