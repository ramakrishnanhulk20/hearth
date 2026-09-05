"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { createFormat, type Format } from "@/lib/format";
import { localeEntry } from "@/i18n/routing";

/**
 * Every figure and duration on a screen, bound to the language it is being read in.
 *
 * The grouping tag is not the URL code: the copy under `pt` is written for Brazil and under `zh-tw`
 * for Taiwan, and both group and punctuate differently from the bare language tag.
 */
export function useFormat(): Format {
  const locale = useLocale();
  const words = useTranslations("format");

  return useMemo(
    () => createFormat(localeEntry(locale).intl, (key, values) => words(key, values)),
    [locale, words],
  );
}
