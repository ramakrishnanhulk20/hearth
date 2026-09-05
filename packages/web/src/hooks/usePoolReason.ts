"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

/**
 * Why a token is on the shelf but cannot be saved in, in the reader's language.
 *
 * The reason itself is written by the deployment file that `scripts/sync-pools.mjs` produces, so
 * it arrives as one English sentence and would have stayed English in the other fifteen languages
 * on every screen that prints it. This maps the sentences we know about onto a translated one.
 *
 * A reason we have never seen falls through as it was written. That is the honest failure: a new
 * restricted token would show its own English words rather than a message key, and the missing
 * translation is one line to add here once somebody notices.
 */
const KEYS: Record<string, string> = {
  "mint restricted to the issuer": "restrictedMint",
};

export function usePoolReason(): (reason: string) => string {
  const t = useTranslations("picker.reasons");

  return useCallback(
    (reason: string) => {
      const key = KEYS[reason.trim().toLowerCase()];
      return key ? t(key) : reason;
    },
    [t],
  );
}
