"use client";

import { useState } from "react";
import type { Address, Hex } from "viem";
import { useMessages } from "@/i18n/LocaleProvider";

type Outcome =
  | { state: "idle" }
  | { state: "asking" }
  | { state: "refused"; detail: string }
  | { state: "unreachable"; detail: string }
  | { state: "leaked"; value: string };

export function SealedHandle({ handle, owner }: { handle: Hex | null; owner: Address | null }) {
  const m = useMessages();
  const [outcome, setOutcome] = useState<Outcome>({ state: "idle" });

  async function attempt() {
    if (!handle) return;
    setOutcome({ state: "asking" });

    try {

      const [{ ZamaSDK }, { createConfig }, { web }, { sepolia: fheSepolia }, viem, { sepolia }] =
        await Promise.all([
          import("@zama-fhe/sdk"),
          import("@zama-fhe/sdk/viem"),
          import("@zama-fhe/sdk/web"),

          import("@zama-fhe/sdk/chains"),
          import("viem"),
          import("viem/chains"),
        ]);

      const transport = viem.http();
      const sdk = new ZamaSDK(
        createConfig({
          chains: [fheSepolia],
          publicClient: viem.createPublicClient({ chain: sepolia, transport }),

          walletClient: viem.createWalletClient({ chain: sepolia, transport }),
          relayers: { [fheSepolia.id]: web({ timeout: 30_000 }) },
        }),
      );

      const result = await sdk.decryption.decryptPublicValues([handle]);
      const value = Object.values(result.clearValues ?? {})[0];

      setOutcome({ state: "leaked", value: String(value) });
    } catch (error) {

      const cause = (error as { cause?: { message?: string } })?.cause?.message;
      const detail = cause ?? (error instanceof Error ? error.message : String(error));
      const refused = /not allowed for (public )?decryption|unauthori|not entitled|acl/i.test(detail);
      setOutcome(refused ? { state: "refused", detail } : { state: "unreachable", detail });
    }
  }

  if (!handle) {
    return (
      <div className="glass p-6">
        <p className="text-[11px] uppercase tracking-label text-faint">{m.hero.sealedLabel}</p>
        <p className="mt-4 text-[14px] leading-relaxed text-muted">{m.hero.sealedEmpty}</p>
      </div>
    );
  }

  return (
    <div className="glass p-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[11px] uppercase tracking-label text-faint">{m.hero.sealedLabel}</p>
        {owner && (
          <span className="font-sans text-[11px] tabular-nums text-faint">
            {owner.slice(0, 6)}&hellip;{owner.slice(-4)}
          </span>
        )}
      </div>

      <p className="mt-4 break-all font-sans text-[13px] leading-relaxed tabular-nums text-white/30">
        {handle.slice(0, 34)}
        <span className="text-white/15">{handle.slice(34)}</span>
      </p>

      <div className="mt-5 min-h-[3.25rem]">
        {outcome.state === "idle" && (
          <button
            type="button"
            onClick={attempt}
            className="w-full rounded-lg border border-hairline px-4 py-3 text-[14px] text-parchment transition-colors duration-200 hover:border-flame/50 hover:bg-flame/[0.06] hover:text-flame"
          >
            {m.hero.sealedTry}
          </button>
        )}

        {outcome.state === "asking" && (
          <p className="flex items-center gap-2.5 py-3 text-[14px] text-muted">
            <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-flame" />
            {m.hero.sealedAsking}
          </p>
        )}

        {outcome.state === "refused" && (
          <div>
            <p className="text-[14px] font-medium text-flame">{m.hero.sealedRefused}</p>
            <p className="mt-2 border-l-2 border-flame/40 pl-3 text-[12.5px] leading-relaxed text-muted">
              {outcome.detail}
            </p>
            <p className="mt-2.5 text-[13px] leading-relaxed text-faint">{m.hero.sealedRefusedNote}</p>
          </div>
        )}

        {outcome.state === "unreachable" && (
          <div>
            <p className="text-[14px] text-parchment">{m.hero.sealedUnreachable}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-faint">{m.hero.sealedUnreachableNote}</p>
          </div>
        )}

        {outcome.state === "leaked" && (
          <div>
            <p className="text-[14px] font-medium text-bad">It decrypted, and it should not have.</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              The service returned {outcome.value}. Please tell us, because this is the one result
              this product is built to make impossible.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
