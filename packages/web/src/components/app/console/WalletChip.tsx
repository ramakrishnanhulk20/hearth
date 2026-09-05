"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { addressUrl, CHAIN_ID } from "@/lib/chain/addresses";
import { wagmiConfig, WALLET_DOWNLOAD_URL } from "@/lib/chain/wagmi";
import { shortAddress } from "@/lib/format";
import { useWallets } from "@/hooks/useWallets";
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
  const t = useTranslations("console.wallet");
  const { address, isConnected, chainId } = useAccount();
  const wallets = useWallets();
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

  const wrongChain = isConnected && chainId !== CHAIN_ID;

  if (!isConnected) {
    // No extension and no WalletConnect is a browser this app cannot be used from, and the rail
    // is the wrong place for a paragraph about it. The link is the whole answer here, and the
    // screens carry the sentence.
    if (!wallets.primary) {
      return (
        <a
          href={WALLET_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-lg border border-hairlineStrong px-3 py-2.5 text-center text-[13.5px] font-medium text-parchment transition-colors hover:bg-hover"
        >
          {t("getWallet")}
        </a>
      );
    }

    return (
      <button
        type="button"
        onClick={() => wallets.primary && wallets.connect(wallets.primary)}
        disabled={wallets.isPending}
        className="w-full rounded-lg bg-flameFill px-3 py-2.5 text-[13.5px] font-semibold text-onFlame transition-all duration-200 hover:shadow-ember disabled:opacity-50"
      >
        {wallets.isPending ? t("connecting") : wallets.primaryIsScan ? t("scan") : t("connect")}
      </button>
    );
  }

  if (wrongChain) {
    return (
      <button
        type="button"
        onClick={() => switchChain({ chainId: sepolia.id })}
        disabled={switching}
        className="w-full rounded-lg border border-bad/45 bg-bad/[0.08] px-3 py-2.5 text-[13px] font-medium text-bad transition-colors hover:bg-bad/[0.14]"
      >
        {switching ? t("switching") : t("switchTo", { network: NETWORK })}
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
          aria-label={t("options")}
          // The dot stays 24 pixels because the chip is 44 tall and a bigger square would crowd
          // the address beside it. The invisible square around it is what a thumb actually hits.
          className="relative -me-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-muted transition-colors after:absolute after:-inset-[10px] after:content-[''] hover:bg-hover hover:text-parchment"
        >
          <MoreIcon size={16} />
        </button>
      </div>

      {/* A popover the colour of the rail it opens over needs its edge and its shadow to do the
          separating, so both are stronger here than anywhere else in the console. */}
      {menuOpen && (
        <div
          role="menu"
          className={`panel-glare absolute end-0 z-50 w-full min-w-[180px] overflow-hidden rounded-xl border border-hairlineStrong bg-surface py-1 shadow-popover ${
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
              {t("explorer")}
            </a>
          )}
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setMenuOpen(false);
              disconnect();
            }}
            className="block w-full px-3 py-2 text-start text-[13px] text-muted transition-colors hover:bg-hover hover:text-parchment"
          >
            {t("disconnect")}
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
