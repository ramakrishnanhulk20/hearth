"use client";

import { useState } from "react";
import type { Address, Hex } from "viem";
import { shortAddress } from "@/lib/format";

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
  const [outcome, setOutcome] = useState<Outcome>({ state: "idle" });

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
        <p className="text-[11px] uppercase tracking-label text-faint">A saver&apos;s balance</p>
        <p className="mt-4 text-[14px] leading-relaxed text-muted">
          Nobody has deposited yet. As soon as somebody does, their encrypted balance appears here and
          you can try to open it.
        </p>
      </div>
    );
  }

  return (
    <div className="glass p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[11px] uppercase tracking-label text-faint">A saver&apos;s balance</p>
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
            Try to open it
          </button>
        )}

        {outcome.state === "asking" && (
          <p className="flex items-center gap-2.5 py-3 text-[14px] text-muted">
            <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-flame" />
            Asking Zama&apos;s key management service
          </p>
        )}

        {outcome.state === "refused" && (
          <div>
            <p className="text-[14px] font-medium text-flame">Refused.</p>
            <p className="mt-2 border-l-2 border-flame/40 pl-3 text-[12.5px] leading-relaxed text-muted">
              {outcome.detail}
            </p>
            <p className="mt-2.5 text-[13px] leading-relaxed text-faint">
              That came from Zama&apos;s key management service, not from this page. Only the wallet
              holding this balance can read it, and no administrator can override that.
            </p>
          </div>
        )}

        {outcome.state === "unreachable" && (
          <div>
            <p className="text-[14px] text-parchment">Could not reach the decryption service.</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-faint">
              That is a network problem rather than a refusal, so it proves nothing either way. Worth
              trying again in a moment.
            </p>
            <button
              type="button"
              onClick={attempt}
              className="mt-3 w-full rounded-lg border border-hairline px-4 py-3 text-[14px] text-parchment transition-colors duration-200 hover:border-flame/50 hover:bg-flame/[0.06] hover:text-flame"
            >
              Try again
            </button>
          </div>
        )}

        {outcome.state === "leaked" && (
          <div>
            <p className="text-[14px] font-medium text-bad">It decrypted, and it should not have.</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              The service returned {outcome.value}. Please tell us, because this is the one result this
              product is built to make impossible.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
