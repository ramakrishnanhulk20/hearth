/** Confidential USDC has six decimals. Formatted through bigint arithmetic so a large balance
 * never loses units to floating point. */
export function usdc(amount: bigint): string {
  const negative = amount < 0n;
  const value = negative ? -amount : amount;
  const whole = value / 1_000_000n;
  const cents = (value % 1_000_000n) / 10_000n;
  return `${negative ? "-" : ""}${group(whole)}.${cents.toString().padStart(2, "0")}`;
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

export function line(message: string): void {
  process.stdout.write(`${stamp()} ${message}\n`);
}

export function problem(message: string): void {
  process.stderr.write(`${stamp()} ${message}\n`);
}
