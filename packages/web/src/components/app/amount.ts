import type { ParsedAmount } from "@/lib/format";

/**
 * A balance written out to every unit it holds.
 *
 * formatAmount stops at two decimals, which is right for reading and wrong for filling a field
 * from a balance: the digits it drops would be left behind by an "All of it" that was supposed to
 * empty the vault, the wallet or the wrapper.
 *
 * No grouping separator and an ASCII point, in every language, because this string goes straight
 * back into the field the saver types into and parseAmount is the thing that has to read it.
 */
export function exactAmount(base: bigint, decimals: number): string {
  const unit = 10n ** BigInt(decimals);
  const whole = base / unit;
  const fraction = (base % unit).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction === "" ? whole.toString() : `${whole}.${fraction}`;
}

/** The smallest amount a token can move, written the way a saver would type it: 0.000001. */
function smallest(decimals: number): string {
  return decimals === 0 ? "1" : `0.${"0".repeat(decimals - 1)}1`;
}

export type AmountProblem = Exclude<Extract<ParsedAmount, { ok: false }>["reason"], "empty">;

export type AmountWords = (key: string, values?: Record<string, string | number>) => string;

/**
 * Why a typed amount was refused. The field says which one rather than sitting disabled.
 *
 * Deposit and withdraw share this wording because they parse with the same function, and a saver
 * who met one sentence on one screen should not meet another on the next.
 */
export function problemText(
  reason: AmountProblem,
  decimals: number,
  symbol: string,
  words: AmountWords,
): string {
  switch (reason) {
    case "shape":
      return words("shape");
    case "precision":
      return words("precision", { symbol, decimals, smallest: smallest(decimals) });
    case "zero":
      return words("zero");
  }
}
