import { matchZamaError } from "@zama-fhe/sdk";

/** What the app can offer the saver next. The console turns each of these into a button. */
export type Remedy = "approve" | "faucet" | "wrap" | "switch" | "connect" | "retry" | "none";

export type RoutedError = {
  message: string;
  remedy: Remedy;
  /** True when nothing is wrong with the request and asking again is the whole fix. */
  retryable: boolean;
  /** The SDK's own code where it had one, so a caller can branch on the exact case. */
  code?: string;
};

/** Every nested shape viem, ethers and the FHE backend hide a lower-level failure under. */
function chain(error: unknown): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 8 && current !== null && current !== undefined; depth++) {
    if (typeof current !== "object") break;
    const node = current as Record<string, unknown>;
    nodes.push(node);
    current = node["cause"] ?? node["error"] ?? node["info"];
  }
  return nodes;
}

function text(error: unknown): string {
  return chain(error)
    .map((node) => {
      const parts = [node["shortMessage"], node["message"], node["details"], node["reason"]];
      return parts.filter((part) => typeof part === "string").join(" ");
    })
    .join(" ")
    .toLowerCase();
}

/**
 * Sepolia's KMS reconstructs a user decryption from nine of thirteen shares. One party currently
 * serves a share the others disagree with, and the bad share is bound to the caller's transport
 * key pair, so waiting never helps and a fresh key pair is the only thing that redraws it.
 * Measured on 2 September 2026: six failures out of six under the same key pair, success on the
 * third try when the key pair was regenerated between tries.
 */
export function isBadKmsShare(error: unknown): boolean {
  const lowered = text(error);
  return lowered.includes("error reconstructing all blocks") || lowered.includes("gao decoding failure");
}

/**
 * A handle written seconds ago is not decryptable until the coprocessor and the node have caught
 * up with the block that wrote it, so a first refusal on a fresh handle is normal.
 */
export function isNotReadyYet(error: unknown): boolean {
  const lowered = text(error);
  return (
    lowered.includes("not allowed for public decryption") ||
    lowered.includes("request timed out") ||
    lowered.includes("maximum polling retry limit exceeded") ||
    lowered.includes("relayer sdk internal error") ||
    lowered.includes("fetch failed") ||
    lowered.includes("socket hang up")
  );
}

export function isUserRejection(error: unknown): boolean {
  const lowered = text(error);
  return (
    lowered.includes("user rejected") ||
    lowered.includes("rejected the request") ||
    lowered.includes("user denied") ||
    lowered.includes("denied the request")
  );
}

/** Contract reverts a saver can actually hit, each answered with what to do next. */
const REVERTS: Record<string, RoutedError> = {
  EnforcedPause: {
    message: "The vault is paused, so deposits and draw closing are stopped. Withdrawing still works.",
    remedy: "none",
    retryable: false,
  },
  NotASaver: {
    message: "This wallet has never deposited, so there is nothing to withdraw.",
    remedy: "none",
    retryable: false,
  },
  NotTheAsset: {
    message: "Only the confidential USDC the vault was deployed with is accepted. Wrap that token and try again.",
    remedy: "wrap",
    retryable: false,
  },
  DrawNotAwarded: {
    message: "That draw has not been awarded yet, so there is nothing to evaluate. Close and award it first.",
    remedy: "none",
    retryable: false,
  },
  EvaluationWindowClosed: {
    message: "That draw's two-period window is over. It can no longer be evaluated, and it pays nothing.",
    remedy: "none",
    retryable: false,
  },
  EvaluationWindowOpen: {
    message: "That draw can still be evaluated, so it cannot be finalized yet. Wait for the window to end.",
    remedy: "none",
    retryable: false,
  },
  AlreadyFinalized: {
    message: "That draw is already finalized. There is nothing left to do on it.",
    remedy: "none",
    retryable: false,
  },
  DrawNotOpen: {
    message: "That draw was never closed, so there is nothing to finalize.",
    remedy: "none",
    retryable: false,
  },
  AlreadyClosed: {
    message: "Somebody closed that draw first. Its award is the next step.",
    remedy: "none",
    retryable: false,
  },
  NothingToClose: {
    message: "No draw is waiting to be closed right now.",
    remedy: "none",
    retryable: false,
  },
  CloseWindowClosed: {
    message: "The closing deadline for that draw has passed. Its liquidity goes back to the tiers and the next draw offers it again.",
    remedy: "none",
    retryable: false,
  },
  WrongStatus: {
    message: "The draw moved on before this transaction landed. Reload and look at where it is now.",
    remedy: "retry",
    retryable: true,
  },
  CarryNotPending: {
    message: "That tier has no published carry waiting, so there is nothing to reconcile.",
    remedy: "none",
    retryable: false,
  },
  InvalidKMSSignatures: {
    message: "The key management service signature did not verify on chain. Ask for the decryption again.",
    remedy: "retry",
    retryable: true,
  },
};

function revertName(error: unknown): string | null {
  for (const node of chain(error)) {
    const data = node["data"] as { errorName?: unknown } | undefined;
    if (data && typeof data.errorName === "string") return data.errorName;
    const name = node["errorName"];
    if (typeof name === "string") return name;
  }
  const lowered = text(error);
  for (const key of Object.keys(REVERTS)) {
    if (lowered.includes(key.toLowerCase())) return key;
  }
  return null;
}

/**
 * Turns anything thrown by the SDK, viem or a contract into one sentence and one thing to do.
 * The SDK's own codes are matched first, because they carry the remedy the SDK already worked out.
 */
export function routeError(error: unknown): RoutedError {
  if (isUserRejection(error)) {
    return { message: "You turned the request down in your wallet. Nothing was sent.", remedy: "none", retryable: false };
  }

  const matched = matchZamaError<RoutedError>(error, {
    INSUFFICIENT_ALLOWANCE: () => ({
      message: "The wrapper is not allowed to take that many USDC yet. Approve it first.",
      remedy: "approve",
      retryable: false,
    }),
    INSUFFICIENT_ERC20_BALANCE: () => ({
      message: "Not enough test USDC in this wallet. Mint some from the faucet.",
      remedy: "faucet",
      retryable: false,
    }),
    INSUFFICIENT_CONFIDENTIAL_BALANCE: () => ({
      message: "Not enough confidential USDC. Wrap some plain USDC first.",
      remedy: "wrap",
      retryable: false,
    }),
    CHAIN_MISMATCH: () => ({
      message: "Your wallet is on a different network from the app. Switch it to Sepolia.",
      remedy: "switch",
      retryable: false,
    }),
    NOT_ENTITLED: () => ({
      message: "This wallet is not allowed to read that value. It belongs to a different address.",
      remedy: "none",
      retryable: false,
      code: "NOT_ENTITLED",
    }),
    NO_CIPHERTEXT: () => ({
      message: "There is no encrypted value here yet, which means a balance of zero.",
      remedy: "none",
      retryable: false,
      code: "NO_CIPHERTEXT",
    }),
    RELAYER_REQUEST_FAILED: (relayerError) => {
      const status = (relayerError as unknown as { status?: number }).status;
      if (status === 429) {
        return {
          message: "Zama's relayer is rate limiting this browser. Wait a few seconds and ask again.",
          remedy: "retry",
          retryable: true,
        };
      }
      return {
        message: `Zama's relayer could not be reached${status ? ` (HTTP ${status})` : ""}. Ask again in a moment.`,
        remedy: "retry",
        retryable: true,
      };
    },
    RPC_RATE_LIMITED: () => ({
      message: "The Sepolia node is rate limiting this browser. Wait a few seconds and ask again.",
      remedy: "retry",
      retryable: true,
    }),
    SIGNING_REJECTED: () => ({
      message: "You turned the signature down in your wallet. Nothing was sent.",
      remedy: "none",
      retryable: false,
    }),
    WALLET_NOT_CONNECTED: () => ({
      message: "Connect a wallet first.",
      remedy: "connect",
      retryable: false,
    }),
    SIGNER_NOT_CONFIGURED: () => ({
      message: "Connect a wallet first.",
      remedy: "connect",
      retryable: false,
    }),
  });
  if (matched) return matched;

  const name = revertName(error);
  if (name && REVERTS[name]) return REVERTS[name];

  const lowered = text(error);
  if (lowered.includes("insufficient funds")) {
    return {
      message: "Not enough Sepolia ETH to pay for gas. Any Sepolia faucet tops it up.",
      remedy: "none",
      retryable: false,
    };
  }
  if (isNotReadyYet(error)) {
    return {
      message: "Zama's relayer has not caught up with that block yet. Ask again in a moment.",
      remedy: "retry",
      retryable: true,
    };
  }

  const raw =
    (error as { shortMessage?: string })?.shortMessage ??
    (error instanceof Error ? error.message.split("\n")[0] : String(error));
  const trimmed = raw.length > 180 ? `${raw.slice(0, 177)}...` : raw;
  return { message: trimmed || "Something went wrong.", remedy: "retry", retryable: false };
}
