"use client";

import { useTranslations } from "next-intl";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { CHAIN_ID } from "@/lib/chain/addresses";
import { WALLET_DOWNLOAD_URL } from "@/lib/chain/wagmi";
import { shortAddress } from "@/lib/format";
import { useWallets } from "@/hooks/useWallets";

export function ConnectBar() {
  const t = useTranslations("console.wallet");
  const { address, isConnected, chainId } = useAccount();
  const wallets = useWallets();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  const wrongChain = isConnected && chainId !== CHAIN_ID;

  if (!isConnected) {
    if (!wallets.primary) {
      return (
        <a
          href={WALLET_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-hairlineStrong px-4 py-2.5 text-[14px] font-medium text-parchment transition-colors hover:bg-hover"
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
        className="rounded-lg bg-flameFill px-4 py-2.5 text-[14px] font-medium text-onFlame transition-transform duration-200 hover:scale-[1.03] disabled:opacity-50"
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
        className="rounded-lg border border-bad/50 bg-bad/10 px-4 py-2.5 text-[14px] font-medium text-bad transition-colors hover:bg-bad/15"
      >
        {switching ? t("switching") : t("switchTo", { network: "Sepolia" })}
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
        {t("disconnect")}
      </button>
    </div>
  );
}
