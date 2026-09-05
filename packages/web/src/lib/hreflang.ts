import type { Metadata } from "next";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/routing";

/** The path this route has in one language. English keeps the unprefixed one. */
export function localePath(path: string, locale: string): string {
  const clean = path === "/" ? "" : path;
  if (locale === DEFAULT_LOCALE) return clean || "/";
  return `/${locale}${clean}`;
}

/**
 * The same page in all sixteen languages, listed on every page.
 *
 * A search engine that finds the Japanese dashboard should know the German one exists, and a
 * reader whose browser is set to German should be sent there rather than made to find the
 * switcher. English keeps the unprefixed path, which is what `x-default` points at too.
 *
 * `path` is the route with no locale in it, as in /how or /app/usdc.
 */
export function alternates(path: string, locale: string = DEFAULT_LOCALE): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const entry of LOCALES) languages[entry.code] = localePath(path, entry.code);
  languages["x-default"] = localePath(path, DEFAULT_LOCALE);

  return { canonical: localePath(path, locale), languages };
}
