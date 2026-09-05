"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import { WALLET_DOWNLOAD_URL } from "@/lib/chain/wagmi";
import { useWallets } from "@/hooks/useWallets";
import { Card } from "./Card";
import { PrimaryButton } from "./PrimaryButton";
import { CARD_NOTE, CARD_PROSE, INLINE_LINK } from "./typography";

/**
 * What a screen shows instead of its form when no wallet is connected.
 *
 * Deposit and withdraw both used to point at the rail and leave the reader to find the button.
 * The button is here instead, and it is the console's own primary control, so the two screens ask
 * for the same thing in the same shape.
 *
 * A browser with no way in at all gets a sentence and a link rather than a dead button. Telling
 * somebody "no wallet found" and stopping there is the end of the product for them.
 *
 * A wallet on the wrong network is not this component's job: the shell puts one banner about that
 * above every route, and a second switch button under it would be two answers to one question.
 */
export function ConnectPrompt({ children, note }: { children: ReactNode; note?: ReactNode }) {
  const t = useTranslations("console.wallet");
  const { isConnected } = useAccount();
  const wallets = useWallets();

  if (isConnected) return null;

  return (
    <Card>
      <p className={CARD_PROSE}>{children}</p>
      {note && <p className={`mt-3 ${CARD_NOTE}`}>{note}</p>}

      {wallets.primary ? (
        <>
          <div className="mt-5">
            <PrimaryButton
              busy={wallets.isPending}
              onClick={() => wallets.primary && wallets.connect(wallets.primary)}
            >
              {wallets.primaryIsScan ? t("scan") : t("connect")}
            </PrimaryButton>
          </div>
          {wallets.secondary && (
            <button
              type="button"
              onClick={() => wallets.secondary && wallets.connect(wallets.secondary)}
              className={`mt-3 ${INLINE_LINK}`}
            >
              {t("scan")}
            </button>
          )}
        </>
      ) : (
        <p className={`mt-5 ${CARD_NOTE}`}>
          {t("noneLead")}
          <a href={WALLET_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className={INLINE_LINK}>
            {t("noneLink")}
          </a>
          {t("noneTail")}
        </p>
      )}
    </Card>
  );
}
