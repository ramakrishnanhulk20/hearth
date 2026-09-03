"use client";

import type { ReactNode } from "react";
import { useAccount, useConnect } from "wagmi";
import { Card } from "./Card";
import { PrimaryButton } from "./PrimaryButton";
import { CARD_NOTE, CARD_PROSE } from "./typography";

/**
 * What a screen shows instead of its form when no wallet is connected.
 *
 * Deposit and withdraw both used to point at the rail and leave the reader to find the button.
 * The button is here instead, and it is the console's own primary control, so the two screens ask
 * for the same thing in the same shape.
 *
 * A wallet on the wrong network is not this component's job: the shell puts one banner about that
 * above every route, and a second switch button under it would be two answers to one question.
 */
export function ConnectPrompt({ children, note }: { children: ReactNode; note?: ReactNode }) {
  const { isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();

  if (isConnected) return null;

  const injected = connectors.find((connector) => connector.type === "injected") ?? connectors[0];

  return (
    <Card>
      <p className={CARD_PROSE}>{children}</p>
      {note && <p className={`mt-3 ${CARD_NOTE}`}>{note}</p>}
      <div className="mt-5">
        <PrimaryButton
          busy={isPending}
          disabled={!injected}
          onClick={() => injected && connect({ connector: injected })}
        >
          {injected ? "Connect wallet" : "No wallet found"}
        </PrimaryButton>
      </div>
    </Card>
  );
}
