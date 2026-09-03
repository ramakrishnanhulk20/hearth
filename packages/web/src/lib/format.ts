import { TOKEN_UNIT } from "@/lib/chain/addresses";

export function formatWhole(base: bigint): string {
  return (base / TOKEN_UNIT).toLocaleString("en-US");
}

export function formatAmount(base: bigint): string {
  const negative = base < 0n;
  const absolute = negative ? -base : base;
  const whole = (absolute / TOKEN_UNIT).toLocaleString("en-US");
  const fraction = (absolute % TOKEN_UNIT).toString().padStart(6, "0").slice(0, 2);
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export type ParsedAmount =
  | { ok: true; value: bigint }
  | { ok: false; reason: "empty" | "shape" | "precision" | "zero" };

/**
 * Parses a typed amount into base units. Every rejection names itself, because the deposit and
 * withdraw fields tell the saver what is wrong rather than sitting disabled.
 */
export function parseAmount(input: string): ParsedAmount {
  const trimmed = input.trim();
  if (trimmed === "") return { ok: false, reason: "empty" };
  if (!/^\d*\.?\d*$/.test(trimmed)) return { ok: false, reason: "shape" };
  const [whole = "0", fraction = ""] = trimmed.split(".");
  if (fraction.length > 6) return { ok: false, reason: "precision" };
  const padded = (fraction + "000000").slice(0, 6);
  const value = BigInt(whole || "0") * TOKEN_UNIT + BigInt(padded || "0");
  return value > 0n ? { ok: true, value } : { ok: false, reason: "zero" };
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function shortHandle(handle: string): string {
  return `${handle.slice(0, 10)}...${handle.slice(-6)}`;
}

/** A countdown a person can read at a glance, never a bare second count above a minute. */
export function countdown(targetSeconds: number, nowSeconds: number): string {
  const left = Math.max(0, Math.floor(targetSeconds - nowSeconds));
  if (left === 0) return "now";
  if (left < 60) return `${left}s`;
  if (left < 3600) return `${Math.floor(left / 60)}m ${String(left % 60).padStart(2, "0")}s`;
  const hours = Math.floor(left / 3600);
  return `${hours}h ${Math.floor((left % 3600) / 60)}m`;
}

export function timeAgo(seconds: number): string {
  if (seconds < 60) return `${Math.max(0, Math.floor(seconds))}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}

export function formatUtc(seconds: number | bigint): string {
  const value = typeof seconds === "bigint" ? Number(seconds) : seconds;
  if (!Number.isFinite(value) || value <= 0) return "not yet";
  return `${new Date(value * 1000).toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/** Plain-English odds, so a tier's chance reads as a chance rather than a fraction. */
export function oddsLabel(numerator: bigint, denominator: bigint): string {
  if (numerator === 0n) return "never";
  if (numerator >= denominator) return "every draw";
  return `1 draw in ${(denominator / numerator).toString()}`;
}
