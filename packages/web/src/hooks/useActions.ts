"use client";

import { useCallback, useRef, useState } from "react";
import type { Address, Hex } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import { CONFIDENTIAL_ASSET_ABI, HEARTH_POOL_ABI, HEARTH_VAULT_ABI } from "@/lib/chain/abis";
import { ERC20_ABI } from "@/lib/chain/tokenAbi";
import { wagmiConfig } from "@/lib/chain/wagmi";
import { decryptPublic, toBigint, toBoolean } from "@/lib/zama/decrypt";
import { routeError, type RoutedError } from "@/lib/zama/errors";
import { useZamaSDK } from "@/components/app/Providers";
import type { HearthConfig } from "./useHearth";

export type Phase =
  | { kind: "idle" }
  | { kind: "encrypting" }
  | { kind: "decrypting"; note: string }
  | { kind: "signing" }
  | { kind: "mining"; hash: Hex }
  | { kind: "done"; hash: Hex | null }
  | { kind: "error"; error: RoutedError };

export type Action = {
  phase: Phase;
  /** What the current or last run was called, so the note can name it. */
  label: string;
  busy: boolean;
  reset: () => void;
};

type Setter = (phase: Phase) => void;

const NOT_CONNECTED: RoutedError = {
  message: "Connect a wallet first.",
  remedy: "connect",
  retryable: false,
};

/**
 * Every write the app makes, each one reporting the same four stages: encrypting, signing,
 * mining, done. The draw steps are here too, because closing, awarding, evaluating, finalizing
 * and reconciling are permissionless and the app offers all five to anybody.
 */
export function useActions(config: HearthConfig) {
  const sdk = useZamaSDK();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [label, setLabel] = useState("");
  const running = useRef(false);

  const reset = useCallback(() => setPhase({ kind: "idle" }), []);

  const run = useCallback(
    async (name: string, steps: (set: Setter) => Promise<Hex | null>, onDone?: () => void) => {
      if (running.current) return;
      running.current = true;
      setLabel(name);
      try {
        const hash = await steps(setPhase);
        setPhase({ kind: "done", hash });
        onDone?.();
      } catch (error) {
        setPhase({ kind: "error", error: routeError(error) });
      } finally {
        running.current = false;
      }
    },
    [],
  );

  const send = useCallback(
    async (set: Setter, request: Parameters<typeof writeContractAsync>[0]): Promise<Hex> => {
      set({ kind: "signing" });
      const hash = await writeContractAsync(request);
      set({ kind: "mining", hash });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      return hash;
    },
    [writeContractAsync],
  );

  const encrypt = useCallback(
    async (set: Setter, contractAddress: Address, amount: bigint) => {
      if (!address || !sdk) throw Object.assign(new Error(NOT_CONNECTED.message), { code: "WALLET_NOT_CONNECTED" });
      set({ kind: "encrypting" });
      const { encryptedValues, inputProof } = await sdk.encrypt({
        values: [{ type: "euint64", value: amount }],
        contractAddress,
        userAddress: address,
      });
      return { handle: encryptedValues[0], proof: inputProof };
    },
    [address, sdk],
  );

  const needAddresses = useCallback(() => {
    if (!config.vault || !config.pool || !config.asset || !config.underlying) {
      throw new Error("The Hearth addresses are not configured, so nothing can be sent.");
    }
    return {
      vault: config.vault,
      pool: config.pool,
      asset: config.asset,
      underlying: config.underlying,
    };
  }, [config]);

  const action: Action = { phase, label, busy: phase.kind !== "idle" && phase.kind !== "done" && phase.kind !== "error", reset };

  return {
    ...action,

    mint: (amount: bigint, onDone?: () => void) =>
      run(
        "Get test USDC",
        async (set) => {
          const { underlying } = needAddresses();
          if (!address) throw new Error(NOT_CONNECTED.message);
          return send(set, {
            address: underlying,
            abi: ERC20_ABI,
            functionName: "mint",
            args: [address, amount],
          });
        },
        onDone,
      ),

    approve: (amount: bigint, onDone?: () => void) =>
      run(
        "Approve the wrapper",
        async (set) => {
          const { underlying, asset } = needAddresses();
          return send(set, {
            address: underlying,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [asset, amount],
          });
        },
        onDone,
      ),

    wrap: (amount: bigint, onDone?: () => void) =>
      run(
        "Wrap into confidential USDC",
        async (set) => {
          const { asset } = needAddresses();
          if (!address) throw new Error(NOT_CONNECTED.message);
          return send(set, {
            address: asset,
            abi: CONFIDENTIAL_ASSET_ABI,
            functionName: "wrap",
            args: [address, amount],
          });
        },
        onDone,
      ),

    deposit: (amount: bigint, onDone?: () => void) =>
      run(
        "Deposit",
        async (set) => {
          const { asset, vault } = needAddresses();
          const { handle, proof } = await encrypt(set, asset, amount);
          return send(set, {
            address: asset,
            abi: CONFIDENTIAL_ASSET_ABI,
            functionName: "confidentialTransferAndCall",
            args: [vault, handle, proof, "0x"],
          });
        },
        onDone,
      ),

    withdraw: (amount: bigint, onDone?: () => void) =>
      run(
        "Withdraw",
        async (set) => {
          const { vault } = needAddresses();
          const { handle, proof } = await encrypt(set, vault, amount);
          return send(set, {
            address: vault,
            abi: HEARTH_VAULT_ABI,
            functionName: "withdraw",
            args: [handle, proof],
          });
        },
        onDone,
      ),

    withdrawAll: (onDone?: () => void) =>
      run(
        "Withdraw everything",
        async (set) => {
          const { vault } = needAddresses();
          return send(set, { address: vault, abi: HEARTH_VAULT_ABI, functionName: "withdrawAll", args: [] });
        },
        onDone,
      ),

    closeDraw: (drawId: number, onDone?: () => void) =>
      run(
        `Close draw ${drawId}`,
        async (set) => {
          const { pool } = needAddresses();
          return send(set, { address: pool, abi: HEARTH_POOL_ABI, functionName: "closeDraw", args: [drawId] });
        },
        onDone,
      ),

    /**
     * Asks the key management service for the four handles a close published, then hands the
     * cleartexts and the proof back to the pool. The order is fixed: awardDraw re-encodes
     * [seed, scale count, non-empty, harvest] and checks the signature over that encoding, so any
     * other order makes the on-chain check revert.
     */
    awardDraw: (drawId: number, onDone?: () => void) =>
      run(
        `Award draw ${drawId}`,
        async (set) => {
          const { pool } = needAddresses();
          if (!sdk) throw new Error(NOT_CONNECTED.message);
          const draw = await readContract(wagmiConfig, {
            address: pool,
            abi: HEARTH_POOL_ABI,
            functionName: "drawOf",
            args: [drawId],
          });
          if (Number(draw.status) !== 1) {
            throw new Error(`Draw ${drawId} is not waiting for its award, so there is nothing to send.`);
          }

          set({ kind: "decrypting", note: "asking Zama's key management service for the seed" });
          const published = await decryptPublic(
            sdk,
            [draw.seedHandle, draw.scaleHandle, draw.nonEmptyHandle, draw.harvestHandle] as Hex[],
            {
              onNote: (note) =>
                set({
                  kind: "decrypting",
                  note:
                    note === "sealing"
                      ? "the seed is published but not decryptable yet, asking again"
                      : "asking Zama's key management service for the seed",
                }),
            },
          );

          return send(set, {
            address: pool,
            abi: HEARTH_POOL_ABI,
            functionName: "awardDraw",
            args: [
              drawId,
              toBigint(published.values[0]),
              Number(toBigint(published.values[1])),
              toBoolean(published.values[2]),
              toBigint(published.values[3]),
              published.proof,
            ],
          });
        },
        onDone,
      ),

    evaluate: (drawId: number, count: bigint, onDone?: () => void) =>
      run(
        `Advance draw ${drawId}`,
        async (set) => {
          const { vault } = needAddresses();
          return send(set, {
            address: vault,
            abi: HEARTH_VAULT_ABI,
            functionName: "evaluate",
            args: [drawId, count],
          });
        },
        onDone,
      ),

    finalizeDraw: (drawId: number, onDone?: () => void) =>
      run(
        `Finalize draw ${drawId}`,
        async (set) => {
          const { vault } = needAddresses();
          return send(set, {
            address: vault,
            abi: HEARTH_VAULT_ABI,
            functionName: "finalizeDraw",
            args: [drawId],
          });
        },
        onDone,
      ),

    reconcile: (tier: number, onDone?: () => void) =>
      run(
        `Reconcile tier ${tier}`,
        async (set) => {
          const { vault, pool } = needAddresses();
          if (!sdk) throw new Error(NOT_CONNECTED.message);
          const [handle, , pending] = await readContract(wagmiConfig, {
            address: vault,
            abi: HEARTH_VAULT_ABI,
            functionName: "publishedCarry",
            args: [tier],
          });
          if (!pending) throw new Error("That tier has no published carry waiting, so there is nothing to reconcile.");

          set({ kind: "decrypting", note: "asking for the tier's unpaid liquidity" });
          const published = await decryptPublic(sdk, [handle as Hex]);

          return send(set, {
            address: pool,
            abi: HEARTH_POOL_ABI,
            functionName: "reconcile",
            args: [tier, toBigint(published.values[0]), published.proof],
          });
        },
        onDone,
      ),
  };
}
