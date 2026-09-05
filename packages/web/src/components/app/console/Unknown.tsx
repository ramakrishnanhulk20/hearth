"use client";

import { useTranslations } from "next-intl";

/**
 * What a figure shows before its read comes back.
 *
 * Printing a zero here would be inventing a number, and the difference between "the pool holds
 * nothing" and "we have not heard from the chain" is the whole point of the screen.
 *
 * It carries the body tone rather than the faintest one. This word is the answer to the question
 * the figure was asking, and an answer nobody can read is worse than the zero it replaced.
 */
export function Unknown({
  reason,
  scale = "figure",
}: {
  /** Why this figure is missing, on hover. Falls back to the general sentence. */
  reason?: string;
  /**
   * "figure" shrinks the word inside a 28px headline number. "inline" leaves it at the size of
   * the sentence around it, for a table cell or a balance line.
   */
  scale?: "figure" | "inline";
}) {
  const t = useTranslations("console.unknown");

  return (
    <span
      className={`text-muted ${scale === "figure" ? "text-[0.62em] font-normal tracking-normal" : ""}`}
      title={reason ?? t("default")}
    >
      {t("word")}
    </span>
  );
}
