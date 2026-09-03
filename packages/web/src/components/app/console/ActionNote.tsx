"use client";

import { Spinner } from "@/components/ui";
import { txUrl } from "@/lib/chain/addresses";
import type { Phase } from "@/hooks/useActions";
import { INLINE_LINK } from "./typography";

export type NoteTone = "working" | "good" | "bad";

const SKIN: Record<NoteTone, string> = {
  working: "border-hairline bg-raised",
  good: "border-good/40 bg-good/[0.08]",
  bad: "border-bad/40 bg-bad/[0.08]",
};

const TEXT: Record<NoteTone, string> = {
  working: "text-muted",
  good: "text-good",
  bad: "text-bad",
};

const WORKING: Record<string, string> = {
  encrypting: "encrypting and proving, about ten seconds",
  signing: "confirm in your wallet",
  mining: "waiting for the transaction to be mined",
};

export type ActionNoteProps = {
  tone: NoteTone;
  /** Null while nothing is happening, which leaves the region in the page with nothing in it. */
  text: string | null;
  hash?: string | null;
  /** Passed only once the run has settled, because there is nothing to dismiss before that. */
  onDismiss?: () => void;
};

/**
 * Where an action has got to, under the control that started it.
 *
 * The console draws its own rather than using the shared PhaseNote, which paints itself on the
 * landing page's translucent glass and would sit inside a console card as a second panel.
 *
 * The live region is mounted whatever the action is doing, empty included, because a screen
 * reader only announces a region that was already in the page when its text changed.
 */
export function ActionNote({ tone, text, hash, onDismiss }: ActionNoteProps) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {text !== null && (
        <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3.5 ${SKIN[tone]}`}>
          {tone === "working" && (
            <span className="mt-0.5">
              <Spinner size={14} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className={`text-[13px] leading-relaxed ${TEXT[tone]}`}>{text}</p>
            {hash && (
              <a
                href={txUrl(hash)}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-1 inline-block text-[12.5px] ${INLINE_LINK}`}
              >
                View the transaction on Etherscan
              </a>
            )}
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 text-[12.5px] text-muted transition-colors hover:text-parchment"
            >
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The four stages every write goes through, turned into the note above.
 *
 * Deposit, withdraw, draws and run all drive one useActions instance, so they all report through
 * this rather than each writing the stage names out again.
 */
export function phaseNote(phase: Phase, label: string, onDismiss: () => void): ActionNoteProps {
  if (phase.kind === "idle") {
    return { tone: "working", text: null, hash: null };
  }
  if (phase.kind === "error") {
    return { tone: "bad", text: phase.error.message, hash: null, onDismiss };
  }
  if (phase.kind === "done") {
    return { tone: "good", text: `${label}: done`, hash: phase.hash, onDismiss };
  }
  return {
    tone: "working",
    text: phase.kind === "decrypting" ? `${label}: ${phase.note}` : `${label}: ${WORKING[phase.kind] ?? phase.kind}`,
    hash: phase.kind === "mining" ? phase.hash : null,
  };
}
