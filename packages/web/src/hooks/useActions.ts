"use client";

import { useZamaSDK } from "@/components/app/Providers";
import { useCallback, useState } from "react";
import type { Address, Hex } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import { ADDRESSES, CONFIDENTIAL_ABI, ERC20_ABI, POOL_ABI } from "@/lib/chain/contracts";
import { wagmiConfig } from "@/lib/chain/wagmi";
import { useMessages } from "@/i18n/LocaleProvider";
import type { Messages } from "@/i18n";

export type Phase =
  | { kind: "idle" }
  | { kind: "encrypting" }
  | { kind: "signing" }
  | { kind: "mining"; hash: Hex }
  | { kind: "done" }
  | { kind: "error"; message: string };

function readable(error: unknown, e: Messages["errors"]): string {
  const anyError = error as { shortMessage?: string; cause?: { message?: string }; message?: string };
  const raw = anyError.shortMessage ?? anyError.cause?.message ?? anyError.message ?? e.generic;
  if (/user rejected|rejected the request|denied/i.test(raw)) return e.rejected;
  if (/insufficient funds/i.test(raw)) return e.noGas;
  if (/chain mismatch|does not match/i.test(raw)) return e.wrongChain;
  return raw.length > 160 ? `${raw.slice(0, 157)}…` : raw;
}

export function useActions() {
  const sdk = useZamaSDK();
  const { address } = useAccount();
  const m = useMessages();

  const { writeContractAsync } = useWriteContract();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [label, setLabel] = useState<string>("");

  const run = useCallback(
    async (
      name: string,
      steps: (set: (p: Phase) => void) => Promise<void>,
      onDone?: () => void,
    ) => {
      setLabel(name);
      try {
        await steps(setPhase);
        setPhase({ kind: "done" });
        onDone?.();
      } catch (error) {
        setPhase({ kind: "error", message: readable(error, m.errors) });
      }
    },
    [m.errors],
  );

  const reset = useCallback(() => setPhase({ kind: "idle" }), []);

  async function send(
    set: (p: Phase) => void,
    request: Parameters<typeof writeContractAsync>[0],
  ): Promise<void> {
    set({ kind: "signing" });
    const hash = await writeContractAsync(request);
    set({ kind: "mining", hash });
    await waitForTransactionReceipt(wagmiConfig, { hash });
  }

  async function encrypt(contractAddress: Address, value: bigint) {
    if (!address || !sdk) throw new Error(m.errors.connectFirst);
    const { encryptedValues, inputProof } = await sdk.encrypt({
      values: [{ type: "euint64", value }],
      contractAddress,
      userAddress: address,
    });
    return { handle: encryptedValues[0], proof: inputProof };
  }

  return {
    phase,
    label,
    reset,
    busy: phase.kind !== "idle" && phase.kind !== "done" && phase.kind !== "error",

    getTokens: (amount: bigint, onDone?: () => void) =>
      run(
        m.phase.getTokens,
        async (set) => {
          if (!address) throw new Error(m.errors.connectFirst);
          await send(set, {
            address: ADDRESSES.testUsdc,
            abi: ERC20_ABI,
            functionName: "mint",
            args: [address, amount],
          });
        },
        onDone,
      ),

    wrap: (amount: bigint, allowance: bigint, onDone?: () => void) =>
      run(
        m.phase.wrapping,
        async (set) => {
          if (!address) throw new Error(m.errors.connectFirst);
          if (allowance < amount) {
            await send(set, {
              address: ADDRESSES.testUsdc,
              abi: ERC20_ABI,
              functionName: "approve",
              args: [ADDRESSES.confidentialUsdc, amount],
            });
          }
          await send(set, {
            address: ADDRESSES.confidentialUsdc,
            abi: CONFIDENTIAL_ABI,
            functionName: "wrap",
            args: [address, amount],
          });
        },
        onDone,
      ),

    deposit: (amount: bigint, onDone?: () => void) =>
      run(
        m.phase.depositing,
        async (set) => {
          set({ kind: "encrypting" });
          const { handle, proof } = await encrypt(ADDRESSES.confidentialUsdc, amount);
          await send(set, {
            address: ADDRESSES.confidentialUsdc,
            abi: CONFIDENTIAL_ABI,
            functionName: "confidentialTransferAndCall",
            args: [ADDRESSES.pool, handle, proof, "0x"],
          });
        },
        onDone,
      ),

    addToLantern: (amount: bigint, allowance: bigint, onDone?: () => void) =>
      run(
        m.phase.depositing,
        async (set) => {
          if (!address) throw new Error(m.errors.connectFirst);
          if (allowance < amount) {
            await send(set, {
              address: ADDRESSES.testUsdc,
              abi: ERC20_ABI,
              functionName: "approve",
              args: [ADDRESSES.confidentialUsdc, amount],
            });
          }
          await send(set, {
            address: ADDRESSES.confidentialUsdc,
            abi: CONFIDENTIAL_ABI,
            functionName: "wrap",
            args: [address, amount],
          });
          set({ kind: "encrypting" });
          const { handle, proof } = await encrypt(ADDRESSES.confidentialUsdc, amount);
          await send(set, {
            address: ADDRESSES.confidentialUsdc,
            abi: CONFIDENTIAL_ABI,
            functionName: "confidentialTransferAndCall",
            args: [ADDRESSES.pool, handle, proof, "0x"],
          });
        },
        onDone,
      ),

    withdraw: (amount: bigint, onDone?: () => void) =>
      run(
        m.phase.withdrawing,
        async (set) => {
          set({ kind: "encrypting" });
          const { handle, proof } = await encrypt(ADDRESSES.pool, amount);
          await send(set, {
            address: ADDRESSES.pool,
            abi: POOL_ABI,
            functionName: "withdraw",
            args: [handle, proof],
          });
        },
        onDone,
      ),

    claim: (onDone?: () => void) =>
      run(
        m.phase.claiming,
        async (set) => {
          await send(set, { address: ADDRESSES.pool, abi: POOL_ABI, functionName: "claim", args: [] });
        },
        onDone,
      ),

    runDraw: (onDone?: () => void) =>
      run(
        m.phase.runningDraw,
        async (set) => {
          const pool = { address: ADDRESSES.pool, abi: POOL_ABI } as const;
          const phaseNow = await readContract(wagmiConfig, { ...pool, functionName: "phase" });

          if (Number(phaseNow) === 0) {
            await send(set, { ...pool, functionName: "openDraw", args: [] });
          }

          for (let guard = 0; guard < 64; guard++) {
            const phase = await readContract(wagmiConfig, { ...pool, functionName: "phase" });
            if (Number(phase) === 0) break;
            const chunk = await readContract(wagmiConfig, { ...pool, functionName: "maxChunk" });
            await send(set, { ...pool, functionName: "scanChunk", args: [chunk] });
          }
        },
        onDone,
      ),
  };
}
