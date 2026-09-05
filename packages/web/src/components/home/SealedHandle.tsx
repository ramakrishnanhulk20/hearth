"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Address, Hex } from "viem";
import { useElapsed } from "@/hooks/useElapsed";
import { shortAddress } from "@/lib/format";

/** Past this many seconds the wait stops being quick and gets a number on it. */
const PATIENCE = 5;

type Outcome =
  | { state: "idle" }
  | { state: "asking" }
  | { state: "refused"; detail: string }
  | { state: "unreachable"; detail: string }
  | { state: "leaked"; value: string };

/**
 * A real saver's encrypted principal, offered to the reader to break open.
 *
 * The refusal is the product. It comes from Zama's key management service rather than from this
 * page, so it is worth showing verbatim: an access control list that says no is stronger evidence
 * than any sentence about privacy this page could write.
 */
export function SealedHandle({ handle, owner }: { handle: Hex | null; owner: Address | null }) {
  const t = useTranslations("landing.sealed");
  const [outcome, setOutcome] = useState<Outcome>({ state: "idle" });
  const elapsed = useElapsed(outcome.state === "asking");

  async function attempt() {
    if (!handle) return;
    setOutcome({ state: "asking" });

    try {
      const { readOnlySdk } = await import("@/lib/zama/readOnly");
      const sdk = await readOnlySdk();
      const result = await sdk.decryption.decryptPublicValues([handle]);
      const value = Object.values(result.clearValues ?? {})[0];
      setOutcome({ state: "leaked", value: String(value) });
    } catch (error) {
      const cause = (error as { cause?: { message?: string } })?.cause?.message;
      const detail = cause ?? (error instanceof Error ? error.message : String(error));
      const refused = /not allowed for (public )?decryption|unauthori|not entitled|acl/i.test(detail);
      setOutcome(refused ? { state: "refused", detail } : { state: "unreachable", detail });
    }
  }

  if (!handle) {
    return (
      <div className="glass p-5 sm:p-6">
        <p className="text-[11px] uppercase tracking-label text-faint">{t("heading")}</p>
        <p className="mt-4 text-[14px] leading-relaxed text-muted">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="glass p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[11px] uppercase tracking-label text-faint">{t("heading")}</p>
        {owner && <span className="font-sans text-[11px] tabular-nums text-faint">{shortAddress(owner)}</span>}
      </div>

      <p className="mt-4 break-all font-sans text-[13px] leading-relaxed tabular-nums text-white/30">
        {handle.slice(0, 34)}
        <span className="text-white/15">{handle.slice(34)}</span>
      </p>

      <div className="mt-5 min-h-[3.25rem]">
        {outcome.state === "idle" && (
          <button
            type="button"
            onClick={attempt}
            className="w-full rounded-lg border border-hairline px-4 py-3 text-[14px] text-parchment transition-colors duration-200 hover:border-flame/50 hover:bg-flame/[0.06] hover:text-flame"
          >
            {t("try")}
          </button>
        )}

        {outcome.state === "asking" && (
          <div className="py-3">
            <p className="flex items-center gap-2.5 text-[14px] text-muted">
              <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-flame" />
              {t("asking")}
            </p>
            {/* An honest label on a wait nobody can predict. The key management service usually
                answers in a second or two and occasionally takes far longer, and a pulsing dot
                says the same thing at both. */}
            <p className="mt-1.5 ps-4 text-[12.5px] tabular-nums text-faint">
              {elapsed >= PATIENCE ? t("askingLong", { seconds: elapsed }) : t("askingWait")}
            </p>
          </div>
        )}

        {outcome.state === "refused" && (
          <div>
            <p className="text-[14px] font-medium text-flame">{t("refused")}</p>
            <p className="mt-2 border-s-2 border-flame/40 ps-3 text-[12.5px] leading-relaxed text-muted">
              {outcome.detail}
            </p>
            <p className="mt-2.5 text-[13px] leading-relaxed text-faint">{t("refusedNote")}</p>
          </div>
        )}

        {outcome.state === "unreachable" && (
          <div>
            <p className="text-[14px] text-parchment">{t("unreachable")}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-faint">{t("unreachableNote")}</p>
            <button
              type="button"
              onClick={attempt}
              className="mt-3 w-full rounded-lg border border-hairline px-4 py-3 text-[14px] text-parchment transition-colors duration-200 hover:border-flame/50 hover:bg-flame/[0.06] hover:text-flame"
            >
              {t("again")}
            </button>
          </div>
        )}

        {outcome.state === "leaked" && (
          <div>
            <p className="text-[14px] font-medium text-bad">{t("leaked")}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              {t("leakedNote", { value: outcome.value })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
