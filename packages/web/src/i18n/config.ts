export const LOCALES = ["en", "zh", "hi", "es", "ru", "ja", "de", "fr", "ko", "ta"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  zh: "中文",
  hi: "हिन्दी",
  es: "Español",
  ru: "Русский",
  ja: "日本語",
  de: "Deutsch",
  fr: "Français",
  ko: "한국어",
  ta: "தமிழ்",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
