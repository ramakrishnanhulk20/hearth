"use client";

import { useEffect, useMemo, useState } from "react";
import type { Connector } from "wagmi";
import { useConnect } from "wagmi";

export type Wallets = {
  /** The connector the main button uses. Null when this browser has no way in at all. */
  primary: Connector | null;
  /** The other way in, offered under the main button. Null when there is only one. */
  secondary: Connector | null;
  /** True when the offered connector opens a code for a phone rather than an extension. */
  primaryIsScan: boolean;
  connect: (connector: Connector) => void;
  isPending: boolean;
};

/**
 * Which ways into this browser actually exist right now.
 *
 * wagmi lists every configured connector whether or not it can run, so the old check found the
 * injected connector on a machine with no extension and offered a button that could never
 * connect. The connector is asked for its provider instead, which is the only answer that is
 * about this browser rather than about the config.
 *
 * While the answer is still coming the extension is assumed present. It resolves in a tick, and
 * flashing "no wallet" at somebody who has one is worse than the other way round.
 */
export function useWallets(): Wallets {
  const { connect, connectors, isPending } = useConnect();

  const injected = useMemo(
    () => connectors.find((connector) => connector.type === "injected") ?? null,
    [connectors],
  );
  const scan = useMemo(
    () => connectors.find((connector) => connector.type === "walletConnect") ?? null,
    [connectors],
  );

  const [probed, setProbed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!injected) return;
    let cancelled = false;
    injected
      .getProvider()
      .then((provider) => {
        if (!cancelled) setProbed(Boolean(provider));
      })
      .catch(() => {
        if (!cancelled) setProbed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [injected]);

  // No connector at all is an answer already, so it never needs the probe.
  const injectedReady = injected === null ? false : probed;

  return useMemo(() => {
    const extension = injectedReady === false ? null : injected;
    const primary = extension ?? scan;
    return {
      primary,
      secondary: extension && scan ? scan : null,
      primaryIsScan: primary !== null && primary === scan,
      connect: (connector: Connector) => connect({ connector }),
      isPending,
    };
  }, [injected, injectedReady, scan, connect, isPending]);
}
