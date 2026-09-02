"use client";

import { useZamaSDK } from "@/components/app/Providers";
import { useCallback, useState } from "react";
import type { Address, Hex } from "viem";

export type Reveal =
  | { state: "sealed" }
  | { state: "revealing" }
  | { state: "revealed"; value: bigint }
  | { state: "denied" }
  | { state: "error"; message: string };

export function useReveal(contractAddress: Address) {
  const sdk = useZamaSDK();
  const [reveal, setReveal] = useState<Reveal>({ state: "sealed" });

  const open = useCallback(
    async (handle: Hex | null) => {
      if (!handle) {
        setReveal({ state: "revealed", value: 0n });
        return;
      }
      if (!sdk) {
        setReveal({ state: "error", message: "Connect a wallet to decrypt." });
        return;
      }
      setReveal({ state: "revealing" });
      try {
        const result = await sdk.decryption.decryptValues([{ encryptedValue: handle, contractAddress }]);
        const value = Object.values(result)[0];
        setReveal({ state: "revealed", value: typeof value === "bigint" ? value : BigInt(Number(value)) });
      } catch (error) {
        const detail =
          (error as { cause?: { message?: string } })?.cause?.message ??
          (error instanceof Error ? error.message : String(error));
        if (/user rejected|rejected the request|denied the/i.test(detail)) {

          setReveal({ state: "sealed" });
          return;
        }
        const notEntitled = /not entitled|unauthori|not allowed|acl/i.test(detail);
        setReveal(notEntitled ? { state: "denied" } : { state: "error", message: detail });
      }
    },
    [sdk, contractAddress],
  );

  const reseal = useCallback(() => setReveal({ state: "sealed" }), []);

  return { reveal, open, reseal };
}
