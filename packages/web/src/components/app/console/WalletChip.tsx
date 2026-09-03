"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { addressUrl, CHAIN_ID } from "@/lib/chain/addresses";
import { wagmiConfig } from "@/lib/chain/wagmi";
import { shortAddress } from "@/lib/format";
import { ChainIcon, MoreIcon } from "./icons";

/** The network Hearth is deployed on, named by wagmi rather than typed into this file. */
const NETWORK = wagmiConfig.chains.find((chain) => chain.id === CHAIN_ID)?.name ?? `Chain ${CHAIN_ID}`;

/**
 * The wallet at the bottom of the sidebar. Same three states as the old header bar: connect,
 * switch network, connected. The overflow menu holds the two things you can do with an address
 * once it is connected, so neither needs a row of its own.
 *
 * `placement` exists because the chip also sits in the narrow-screen top bar, where a menu opening
 * upwards would open past the top of the window.
 */
export function WalletChip({ placement = "up" }: { placement?: "up" | "down" }) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const injected = connectors.find((connector) => connector.type === "injected") ?? connectors[0];
  const wrongChain = isConnected && chainId !== CHAIN_ID;

  if (!isConnected) {
    return (
      <button
        type="button"
        onClick={() => injected && connect({ connector: injected })}
        disabled={isPending || !injected}
        className="w-full rounded-xl bg-flameFill px-3 py-2.5 text-[13.5px] font-semibold text-onFlame transition-colors hover:brightness-[0.94] disabled:opacity-50"
      >
        {isPending ? "Connecting" : injected ? "Connect wallet" : "No wallet found"}
      </button>
    );
  }

  if (wrongChain) {
    return (
      <button
        type="button"
        onClick={() => switchChain({ chainId: sepolia.id })}
        disabled={switching}
        className="w-full rounded-xl border border-bad/45 bg-bad/[0.08] px-3 py-2.5 text-[13px] font-medium text-bad transition-colors hover:bg-bad/[0.14]"
      >
        {switching ? "Switching" : `Switch to ${NETWORK}`}
      </button>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <div className="flex w-full items-center gap-2 rounded-xl border border-hairline bg-raised px-3 py-2.5">
        <span className="block h-1.5 w-1.5 shrink-0 rounded-full bg-good" />
        <span className="min-w-0 flex-1 truncate text-[13px] tabular-nums text-parchment">
          {address ? shortAddress(address) : ""}
        </span>
        <button
          type="button"
          onClick={() => setMenuOpen((was) => !was)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="Wallet options"
          className="-mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:bg-hover hover:text-parchment"
        >
          <MoreIcon size={16} />
        </button>
      </div>

      {menuOpen && (
        <div
          role="menu"
          className={`absolute right-0 z-50 w-full min-w-[180px] overflow-hidden rounded-xl border border-hairline bg-surface py-1 shadow-[0_12px_36px_-16px_rgba(17,19,24,0.35)] ${
            placement === "down" ? "top-[calc(100%+6px)]" : "bottom-[calc(100%+6px)]"
          }`}
        >
          {address && (
            <a
              role="menuitem"
              href={addressUrl(address)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-[13px] text-muted transition-colors hover:bg-hover hover:text-parchment"
            >
              View on Etherscan
            </a>
          )}
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setMenuOpen(false);
              disconnect();
            }}
            className="block w-full px-3 py-2 text-left text-[13px] text-muted transition-colors hover:bg-hover hover:text-parchment"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The network row. The dot answers the question the address alone cannot: whether the wallet is
 * pointed at the chain these contracts are actually on.
 */
export function NetworkChip() {
  const { isConnected, chainId } = useAccount();
  const on = isConnected && chainId === CHAIN_ID;
  const dot = !isConnected ? "bg-faint" : on ? "bg-good" : "bg-bad";

  return (
    <div className="flex w-full items-center gap-2 rounded-xl border border-hairline bg-raised px-3 py-2.5">
      <span className="text-faint">
        <ChainIcon size={16} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-parchment">{NETWORK}</span>
      <span className={`block h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
    </div>
  );
}
