import { defineRouting } from "next-intl/routing";

/**
 * The sixteen languages Hearth reads in, in the order the switcher lists them.
 *
 * `name` is what a reader of that language calls it, never the English name: somebody looking for
 * their own language scans for their own word for it. `intl` is the tag handed to Intl for numbers
 * and dates, which is not always the URL code: the URL says `pt` because it is short, the formatter
 * says `pt-BR` because that is the variant the copy is written in.
 *
 * `script` groups a locale by the typeface it needs, so the layout can load one script font rather
 * than sixteen.
 */
export type Script = "latin" | "cyrillic" | "sc" | "tc" | "jp" | "kr" | "devanagari" | "tamil" | "arabic";

export type LocaleEntry = {
  code: string;
  name: string;
  intl: string;
  script: Script;
  dir: "ltr" | "rtl";
};

export const LOCALES: readonly LocaleEntry[] = [
  { code: "en", name: "English", intl: "en-US", script: "latin", dir: "ltr" },
  { code: "zh", name: "简体中文", intl: "zh-CN", script: "sc", dir: "ltr" },
  { code: "zh-tw", name: "繁體中文", intl: "zh-TW", script: "tc", dir: "ltr" },
  { code: "ja", name: "日本語", intl: "ja-JP", script: "jp", dir: "ltr" },
  { code: "ko", name: "한국어", intl: "ko-KR", script: "kr", dir: "ltr" },
  { code: "vi", name: "Tiếng Việt", intl: "vi-VN", script: "latin", dir: "ltr" },
  { code: "hi", name: "हिन्दी", intl: "hi-IN", script: "devanagari", dir: "ltr" },
  { code: "ta", name: "தமிழ்", intl: "ta-IN", script: "tamil", dir: "ltr" },
  { code: "ru", name: "Русский", intl: "ru-RU", script: "cyrillic", dir: "ltr" },
  { code: "fr", name: "Français", intl: "fr-FR", script: "latin", dir: "ltr" },
  { code: "es", name: "Español", intl: "es-ES", script: "latin", dir: "ltr" },
  { code: "pt", name: "Português (Brasil)", intl: "pt-BR", script: "latin", dir: "ltr" },
  { code: "de", name: "Deutsch", intl: "de-DE", script: "latin", dir: "ltr" },
  { code: "id", name: "Bahasa Indonesia", intl: "id-ID", script: "latin", dir: "ltr" },
  { code: "tr", name: "Türkçe", intl: "tr-TR", script: "latin", dir: "ltr" },
  { code: "ar", name: "العربية", intl: "ar", script: "arabic", dir: "rtl" },
] as const;

export const LOCALE_CODES = LOCALES.map((entry) => entry.code);

export const DEFAULT_LOCALE = "en";

export function localeEntry(code: string): LocaleEntry {
  return LOCALES.find((entry) => entry.code === code) ?? LOCALES[0];
}

export function isLocale(code: string | undefined | null): boolean {
  return typeof code === "string" && LOCALE_CODES.includes(code);
}

/**
 * English keeps the URLs it already had, so every link in the README, the docs and the submission
 * stays where it was. Every other language is prefixed.
 */
export const routing = defineRouting({
  locales: LOCALE_CODES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  localeDetection: true,
  localeCookie: {
    name: "NEXT_LOCALE",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  },
});
