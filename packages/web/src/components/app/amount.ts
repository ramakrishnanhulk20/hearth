import { TOKEN_DECIMALS, TOKEN_UNIT } from "@/lib/chain/addresses";

/**
 * A balance written out to every unit it holds.
 *
 * formatAmount stops at two decimals, which is right for reading and wrong for filling a field
 * from a balance: the four digits it drops would be left behind by an "All of it" that was
 * supposed to empty the vault, the wallet or the wrapper.
 */
export function exactAmount(base: bigint): string {
  const whole = base / TOKEN_UNIT;
  const fraction = (base % TOKEN_UNIT)
    .toString()
    .padStart(TOKEN_DECIMALS, "0")
    .replace(/0+$/, "");
  return fraction === "" ? whole.toString() : `${whole}.${fraction}`;
}

/**
 * Why a typed amount was refused. The field says which one rather than sitting disabled.
 *
 * Deposit and withdraw share this list because they parse with the same function, and a saver who
 * met one wording on one screen should not meet another on the next.
 */
export const PROBLEMS: Record<string, string> = {
  shape: "Numbers only, with at most one decimal point.",
  precision: "USDC has six decimals, so anything finer than 0.000001 cannot be sent.",
  zero: "Enter an amount above zero.",
};
