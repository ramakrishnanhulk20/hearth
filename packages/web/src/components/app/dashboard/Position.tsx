"use client";

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
      label="What you hold"
      pill={
        <CardPill tone={scope.open ? "flame" : "quiet"}>
          {scope.open ? "open in this browser" : "sealed on chain"}
        </CardPill>
      }
      footer={<p className={CARD_NOTE}>{footnote(saver, scope.open)}</p>}
    >
      <div className="grid gap-7 sm:grid-cols-2">
        <Figure
          label="Principal"
          note="What you have saved. Your odds are weighted by this across the whole period."
        >
          <SealedValue
            scope={scope}
            handle={saver.principalHandle}
            requests={requests}
            label="your principal"
            unit="USDC"
            size="large"
            disabled={blocked}
          />
        </Figure>

        <Figure
          label="Unclaimed winnings"
          note="Prize money credited to you and not yet withdrawn. It earns no odds of its own."
        >
          <SealedValue
            scope={scope}
            handle={saver.winningsHandle}
            requests={requests}
            label="your unclaimed winnings"
            unit="USDC"
            size="large"
            eye={false}
          />
        </Figure>
      </div>

      {outside && (
        <p className="mt-6 border-t border-hairlineSoft pt-4 text-[13.5px] leading-relaxed text-muted">
          This wallet is not in the pool right now. Deposit and both figures start filling in.
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

function footnote(saver: SaverState, open: boolean): string {
  if (!saver.connected) {
    return "Connect a wallet to open your own. Nobody else can, and Zama's access list on chain enforces that rather than this page promising it.";
  }
  if (saver.wrongNetwork) {
    return "Opening these needs a signature on Sepolia. Switch the wallet over and the eye works again.";
  }
  if (open) {
    return "Only this browser saw those figures. Nothing was written to the chain and nothing was sent to a server.";
  }
  return "The eye asks Zama's relayer to decrypt values this address owns. One signature, no gas, no transaction.";
}
