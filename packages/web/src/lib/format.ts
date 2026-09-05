/**
 * Every amount in this app belongs to a token, and every token names its own scale. Nothing here
 * assumes six decimals: the pool the screen is on says how many, and a figure formatted with the
 * wrong scale is a wrong number rather than an ugly one.
 *
 * Grouping separators and the words around a duration follow the reader's language. The digits do
 * not: every figure on these screens is money a wallet will show back in Western digits, and a
 * balance a saver cannot match against their wallet is worse than one they cannot read aloud.
 */
const unit = (decimals: number): bigint => 10n ** BigInt(decimals);

/** Western digits, the reader's grouping. `latn` is what pins the digits. */
function grouping(locale: string): Intl.NumberFormat {
  return new Intl.NumberFormat(`${locale}-u-nu-latn`, { maximumFractionDigits: 0 });
}

const groupers = new Map<string, Intl.NumberFormat>();

function group(locale: string, value: bigint | number): string {
  let formatter = groupers.get(locale);
  if (!formatter) {
    formatter = grouping(locale);
    groupers.set(locale, formatter);
  }
  return formatter.format(value);
}

/**
 * A whole number in Western digits with the reader's grouping.
 *
 * Exported for the places that print a figure inside a sentence rather than through a Format:
 * the plural messages hand this in as a value, because ICU's own `#` would be written in
 * whatever numbering system the language defaults to and Arabic's default has moved between
 * releases of the underlying data. Pinning it here means no page depends on that default.
 */
export function groupNumber(locale: string, value: bigint | number): string {
  return group(locale, value);
}

export type ParsedAmount =
  | { ok: true; value: bigint }
  | { ok: false; reason: "empty" | "shape" | "precision" | "zero" };

/**
 * Parses a typed amount into base units. Every rejection names itself, because the deposit and
 * withdraw fields tell the saver what is wrong rather than sitting disabled.
 *
 * Either mark reads as the decimal one. Eleven of the sixteen languages write 0.01 as 0,01 and
 * their keyboards put a comma under the thumb, so a field that only took a point was refusing
 * the amount those savers had typed correctly. A point is still taken everywhere, because that
 * is what a wallet copies out.
 *
 * What is refused is an amount carrying both marks, or the same mark twice. "1,000.5" is one
 * thousand and a half to a reader in English and nothing at all to a reader in German, and
 * guessing which one was meant would sooner or later send the wrong amount on chain. There is no
 * thousands separator here for the same reason. The parse stays exact: the digits are moved
 * around as text and turned into a bigint, so nothing passes through a float.
 */
export function parseAmount(input: string, decimals: number): ParsedAmount {
  const trimmed = input.trim();
  if (trimmed === "") return { ok: false, reason: "empty" };
  if ((trimmed.match(/[.,]/g) ?? []).length > 1) return { ok: false, reason: "shape" };
  const point = trimmed.replace(",", ".");
  if (!/^\d*\.?\d*$/.test(point)) return { ok: false, reason: "shape" };
  const [whole = "0", fraction = ""] = point.split(".");
  if (fraction.length > decimals) return { ok: false, reason: "precision" };
  const padded = (fraction + "0".repeat(decimals)).slice(0, decimals);
  const value = BigInt(whole || "0") * unit(decimals) + BigInt(padded || "0");
  return value > 0n ? { ok: true, value } : { ok: false, reason: "zero" };
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function shortHandle(handle: string): string {
  return `${handle.slice(0, 10)}...${handle.slice(-6)}`;
}

/** The one word each duration and odds line needs, handed in from the `format` namespace. */
export type FormatWords = (key: string, values?: Record<string, string | number>) => string;

export type Format = {
  /** A token amount, two decimals, grouped for the reader. Anything smaller reads as "<0.01". */
  amount(base: bigint, decimals: number): string;
  /** A plain integer: a saver count, a period, a weight in balance-seconds. */
  count(value: bigint | number): string;
  /** A countdown a person can read at a glance, never a bare second count above a minute. */
  countdown(targetSeconds: number, nowSeconds: number): string;
  timeAgo(seconds: number): string;
  utc(seconds: number | bigint): string;
  /** Plain-English odds, so a tier's chance reads as a chance rather than a fraction. */
  odds(numerator: bigint, denominator: bigint): string;
};

export function createFormat(locale: string, words: FormatWords): Format {
  const amount = (base: bigint, decimals: number): string => {
    const negative = base < 0n;
    const absolute = negative ? -base : base;
    const whole = group(locale, absolute / unit(decimals));
    const fraction = (absolute % unit(decimals)).toString().padStart(decimals, "0").slice(0, 2);
    const written = `${whole}.${fraction.padEnd(2, "0")}`;
    // Two decimals is the right scale for money on screen, and it turns dust into a flat zero. A
    // balance that is not empty must never read as empty, so anything below the smallest figure
    // this can write says it is below it instead.
    if (absolute > 0n && whole === group(locale, 0) && fraction === "00") {
      return `${negative ? "-" : ""}${words("dust")}`;
    }
    return `${negative ? "-" : ""}${written}`;
  };

  return {
    amount,
    count: (value) => group(locale, value),

    countdown(targetSeconds, nowSeconds) {
      // useNow answers zero until the browser's clock has started. A countdown against that would
      // be a number of decades, so the one frame before it starts says nothing instead.
      if (nowSeconds === 0) return words("pending");
      const left = Math.max(0, Math.floor(targetSeconds - nowSeconds));
      if (left === 0) return words("now");
      if (left < 60) return words("seconds", { seconds: left });
      if (left < 3600) {
        return words("minutesSeconds", {
          minutes: Math.floor(left / 60),
          seconds: String(left % 60).padStart(2, "0"),
        });
      }
      return words("hoursMinutes", {
        hours: Math.floor(left / 3600),
        minutes: Math.floor((left % 3600) / 60),
      });
    },

    timeAgo(seconds) {
      if (seconds < 60) return words("agoSeconds", { count: Math.max(0, Math.floor(seconds)) });
      if (seconds < 3600) return words("agoMinutes", { count: Math.floor(seconds / 60) });
      if (seconds < 86_400) return words("agoHours", { count: Math.floor(seconds / 3600) });
      return words("agoDays", { count: Math.floor(seconds / 86_400) });
    },

    utc(seconds) {
      const value = typeof seconds === "bigint" ? Number(seconds) : seconds;
      if (!Number.isFinite(value) || value <= 0) return words("notYet");
      // The stamp itself stays ISO in every language. It is a chain timestamp a reader compares
      // against an explorer, and the explorer writes it this way.
      return words("utc", { stamp: new Date(value * 1000).toISOString().slice(0, 16).replace("T", " ") });
    },

    odds(numerator, denominator) {
      if (numerator === 0n) return words("oddsNever");
      if (numerator >= denominator) return words("oddsEveryDraw");
      return words("oddsOneIn", { count: group(locale, denominator / numerator) });
    },
  };
}
