"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { CAP_LABEL, CARD_NOTE, Card, CardPill, SealedValue } from "@/components/app/console";
import type { HearthConfig, SaverState } from "@/hooks/useHearth";
import type { RevealRequest, RevealScope } from "@/hooks/useReveal";

/**
 * What this wallet holds, sealed until its owner asks for it.
 *
 * Both figures ride one eye and one signature. They are two questions about the same address, and
 * prompting the wallet twice to answer them would teach a saver that opening their own numbers is
 * expensive when it costs no gas at all.
 */
export function Position({
  config,
  saver,
  scope,
  known,
}: {
  config: HearthConfig;
  saver: SaverState;
  /** The shared balance scope, so this card and the withdraw screen open together. */
  scope: RevealScope;
  /** False while the saver batch is in flight, which is not the same as an empty wallet. */
  known: boolean;
}) {
  const t = useTranslations("dashboard.position");
  const vault = config.vault;
  const requests: RevealRequest[] = vault
    ? [
        { handle: saver.principalHandle, contractAddress: vault },
        { handle: saver.winningsHandle, contractAddress: vault },
      ]
    : [];

  const blocked = !saver.connected || saver.wrongNetwork || vault === null;
  const outside = known && saver.connected && !saver.isSaver;

  return (
    <Card
      label={t("label")}
      pill={
        <CardPill tone={scope.open ? "flame" : "quiet"}>
          {scope.open ? t("open") : t("sealed")}
        </CardPill>
      }
      footer={<p className={CARD_NOTE}>{t(footnote(saver, scope.open))}</p>}
    >
      <div className="grid gap-7 sm:grid-cols-2">
        <Figure label={t("principal")} note={t("principalNote")}>
          <SealedValue
            scope={scope}
            handle={saver.principalHandle}
            decimals={config.decimals}
            requests={requests}
            label={t("principalSpoken")}
            unit={config.symbol}
            size="large"
            disabled={blocked}
          />
        </Figure>

        <Figure label={t("winnings")} note={t("winningsNote")}>
          <SealedValue
            scope={scope}
            handle={saver.winningsHandle}
            decimals={config.decimals}
            requests={requests}
            label={t("winningsSpoken")}
            unit={config.symbol}
            size="large"
            eye={false}
          />
        </Figure>
      </div>

      {outside && (
        <p className="mt-6 border-t border-hairlineSoft pt-4 text-[13.5px] leading-relaxed text-muted">
          {t("outside")}
        </p>
      )}
    </Card>
  );
}

function Figure({ label, note, children }: { label: string; note: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className={CAP_LABEL}>{label}</p>
      <div className="mt-3">{children}</div>
      <p className={`mt-3 ${CARD_NOTE}`}>{note}</p>
    </div>
  );
}

/** Which of the four footnotes this card carries, named rather than written out. */
function footnote(saver: SaverState, open: boolean): string {
  if (!saver.connected) return "footConnect";
  if (saver.wrongNetwork) return "footNetwork";
  return open ? "footOpen" : "footSealed";
}
