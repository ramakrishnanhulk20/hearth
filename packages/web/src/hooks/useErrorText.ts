"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { RoutedError } from "@/lib/zama/errors";

/**
 * The sentence for a routed failure, in the language the screen is being read in.
 *
 * A failure we did not recognise has no sentence of ours to say, so it shows what the stack
 * actually said. That is untranslated on purpose: an unrecognised message reworded by us would
 * be a guess about what went wrong, and the raw line is what somebody can search for.
 */
export function useErrorText(): (error: RoutedError) => string {
  const t = useTranslations("errors");

  return useCallback(
    (error: RoutedError) => {
      if (error.key) return t(error.key, error.values);
      return error.raw || t("unknown");
    },
    [t],
  );
}
