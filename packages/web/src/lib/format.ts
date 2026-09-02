import { TOKEN_UNIT } from "@/lib/chain/contracts";

export function formatWhole(base: bigint): string {
  return (base / TOKEN_UNIT).toLocaleString("en-US");
}

export function formatAmount(base: bigint): string {
  return (Number(base) / Number(TOKEN_UNIT)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseAmount(input: string): bigint | null {
  const trimmed = input.trim();
  if (!trimmed || !/^\d*\.?\d*$/.test(trimmed)) return null;
  const [whole = "0", fraction = ""] = trimmed.split(".");
  if (fraction.length > 6) return null;
  const padded = (fraction + "000000").slice(0, 6);
  const base = BigInt(whole || "0") * TOKEN_UNIT + BigInt(padded || "0");
  return base > 0n ? base : null;
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function countdown(targetSeconds: number, nowSeconds: number): string {
  const left = Math.max(0, targetSeconds - nowSeconds);
  if (left === 0) return "Ready";
  if (left < 3600) return `${Math.floor(left / 60)}m ${String(left % 60).padStart(2, "0")}s`;
  return `${Math.floor(left / 3600)}h ${Math.floor((left % 3600) / 60)}m`;
}
