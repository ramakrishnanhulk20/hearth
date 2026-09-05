import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, isLocale } from "./routing";
import english from "../../messages/en.json";

type Tree = { [key: string]: string | Tree };

/**
 * English fills every hole.
 *
 * Only `en.json` is complete while a language is being translated, and a half-finished file must
 * show the English sentence rather than throw or print the key. Merging happens per key rather
 * than per file, so a namespace a translator has not reached yet costs nothing.
 */
function merge(base: Tree, over: Tree): Tree {
  const out: Tree = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const under = out[key];
    if (value !== null && typeof value === "object" && under !== null && typeof under === "object") {
      out[key] = merge(under as Tree, value as Tree);
    } else if (typeof value === "string" && value.trim() !== "") {
      out[key] = value;
    }
  }
  return out;
}

async function load(locale: string): Promise<Tree> {
  if (locale === DEFAULT_LOCALE) return english as Tree;
  try {
    const file = (await import(`../../messages/${locale}.json`)) as { default: Tree };
    return merge(english as Tree, file.default);
  } catch {
    // The fifteen other files arrive with the translators. Until one lands, its locale reads in
    // English at its own URL rather than failing to render at all.
    return english as Tree;
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  const asked = await requestLocale;
  const locale = isLocale(asked) ? (asked as string) : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await load(locale)) as never,
    // Every date this app prints is a UTC instant read off the chain, and it is labelled UTC on
    // screen. Naming it here keeps a statically rendered page from picking up the build machine's
    // zone instead.
    timeZone: "UTC",
  };
});
