"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { CHAIN_ID } from "@/lib/chain/contracts";
import { shortAddress } from "@/lib/format";
import { useMessages } from "@/i18n/LocaleProvider";

export function ConnectBar() {
  const m = useMessages();
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  const injected = connectors.find((connector) => connector.type === "injected") ?? connectors[0];
  const wrongChain = isConnected && chainId !== CHAIN_ID;

  if (!isConnected) {
    return (
      <button
        type="button"
        onClick={() => injected && connect({ connector: injected })}
        disabled={isPending || !injected}
        className="rounded-lg bg-flameFill px-5 py-2.5 text-[14px] font-medium text-onFlame transition-transform duration-200 hover:scale-[1.03] disabled:opacity-50"
      >
        {isPending ? m.nav.connecting : m.nav.connect}
      </button>
    );
  }

  if (wrongChain) {
    return (
      <button
        type="button"
        onClick={() => switchChain({ chainId: sepolia.id })}
        disabled={switching}
        className="rounded-lg border border-bad/50 bg-bad/10 px-5 py-2.5 text-[14px] font-medium text-bad transition-colors hover:bg-bad/15"
      >
        {switching ? m.nav.switching : m.nav.switch}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3.5 py-2">
        <span className="block h-1.5 w-1.5 rounded-full bg-good" />
        <span className="font-sans text-[13px] tabular-nums text-parchment">
          {address ? shortAddress(address) : ""}
        </span>
      </span>
      <button
        type="button"
        onClick={() => disconnect()}
        className="text-[13px] text-faint transition-colors hover:text-parchment"
      >{m.nav.disconnect}</button>
    </div>
  );
}

export function useReady() {
  const { isConnected, chainId } = useAccount();
  return isConnected && chainId === CHAIN_ID;
}
