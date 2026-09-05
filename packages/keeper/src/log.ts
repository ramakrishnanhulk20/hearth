/** Confidential USDC has six decimals, which is what an amount defaults to. */
export const DEFAULT_DECIMALS = 6;
export const DEFAULT_SYMBOL = "cUSDC";

/** Two fraction digits, whatever the token's decimals are, because a log line is read at a glance
 * and every Hearth pool holds a token whose smallest useful unit is a cent-sized one. A token with
 * fewer than two decimals prints all of them and no more. */
const FRACTION_DIGITS = 2;

function pow10(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

/**
 * The number part of a token amount, for example `12.40`. Done in bigint arithmetic so a large
 * balance never loses units to floating point.
 */
export function units(value: bigint, decimals: number = DEFAULT_DECIMALS): string {
  const negative = value < 0n;
  const size = negative ? -value : value;
  const unit = pow10(decimals);
  const sign = negative ? "-" : "";
  const whole = `${sign}${group(size / unit)}`;
  const digits = Math.min(decimals, FRACTION_DIGITS);
  if (digits === 0) return whole;
  const fraction = (size % unit) / pow10(decimals - digits);
  return `${whole}.${fraction.toString().padStart(digits, "0")}`;
}

/** A token amount with its symbol, for example `12.40 cUSDC`. */
export function amount(value: bigint, decimals: number = DEFAULT_DECIMALS, symbol: string = DEFAULT_SYMBOL): string {
  return `${units(value, decimals)} ${symbol}`;
}

export function group(value: bigint | number): string {
  const text = value.toString();
  const negative = text.startsWith("-");
  const digits = negative ? text.slice(1) : text;
  const chunks: string[] = [];
  for (let end = digits.length; end > 0; end -= 3) {
    chunks.unshift(digits.slice(Math.max(0, end - 3), end));
  }
  return `${negative ? "-" : ""}${chunks.join(",")}`;
}

export function gwei(wei: bigint): string {
  const whole = wei / 1_000_000_000n;
  const rest = (wei % 1_000_000_000n) / 10_000_000n;
  return rest === 0n ? `${whole}` : `${whole}.${rest.toString().padStart(2, "0")}`;
}

function stamp(): string {
  return new Date().toISOString().slice(11, 19);
}

let prefix = "";

/**
 * Names this process in every line it writes. One keeper drives one pool, and seven of them share
 * a terminal under pm2, so without the name the interleaved lines cannot be told apart. An empty
 * name goes back to unprefixed lines.
 */
export function useName(name: string): void {
  const trimmed = name.trim();
  prefix = trimmed === "" ? "" : `[${trimmed}] `;
}

/** The exact text of a log line, without the newline. Separate from writing it so the shape can be
 * tested without capturing a stream. */
export function decorate(message: string): string {
  return `${stamp()} ${prefix}${message}`;
}

export function line(message: string): void {
  process.stdout.write(`${decorate(message)}\n`);
}

export function problem(message: string): void {
  process.stderr.write(`${decorate(message)}\n`);
}
