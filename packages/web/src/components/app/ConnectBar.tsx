"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { CHAIN_ID } from "@/lib/chain/addresses";
import { shortAddress } from "@/lib/format";

export function ConnectBar() {
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
        className="rounded-lg bg-flameFill px-4 py-2.5 text-[14px] font-medium text-onFlame transition-transform duration-200 hover:scale-[1.03] disabled:opacity-50"
      >
        {isPending ? "Connecting..." : injected ? "Connect wallet" : "No wallet found"}
      </button>
    );
  }

  if (wrongChain) {
    return (
      <button
        type="button"
        onClick={() => switchChain({ chainId: sepolia.id })}
        disabled={switching}
        className="rounded-lg border border-bad/50 bg-bad/10 px-4 py-2.5 text-[14px] font-medium text-bad transition-colors hover:bg-bad/15"
      >
        {switching ? "Switching..." : "Switch to Sepolia"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-2">
        <span className="block h-1.5 w-1.5 rounded-full bg-good" />
        <span className="font-sans text-[13px] tabular-nums text-parchment">
          {address ? shortAddress(address) : ""}
        </span>
      </span>
      <button
        type="button"
        onClick={() => disconnect()}
        className="hidden text-[13px] text-faint transition-colors hover:text-parchment sm:block"
      >
        Disconnect
      </button>
    </div>
  );
}

/** True only when a wallet is connected and pointed at the network Hearth is deployed on. */
export function useReady() {
  const { isConnected, chainId } = useAccount();
  return isConnected && chainId === CHAIN_ID;
}
