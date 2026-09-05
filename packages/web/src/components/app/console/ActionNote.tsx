"use client";

import { useTranslations } from "next-intl";
import { Spinner } from "@/components/ui";
import { txUrl } from "@/lib/chain/addresses";
import type { ActionLabel, Phase } from "@/hooks/useActions";
import { useErrorText } from "@/hooks/useErrorText";
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

export type ActionNoteProps = {
  tone: NoteTone;
  /** Null while nothing is happening, which leaves the region in the page with nothing in it. */
  text: string | null;
  hash?: string | null;
  /** Set when a second control was pressed while this one was running. */
  refused?: string | null;
  /** Passed only once the run has settled, because there is nothing to dismiss before that. */
  onDismiss?: () => void;
};

/**
 * Where an action has got to, under the control that started it.
 *
 * The console draws its own note rather than reusing the landing page's, which paints itself on
 * translucent glass and would sit inside a console card as a second panel.
 *
 * The live region is mounted whatever the action is doing, empty included, because a screen
 * reader only announces a region that was already in the page when its text changed.
 */
export function ActionNote({ tone, text, hash, refused, onDismiss }: ActionNoteProps) {
  const t = useTranslations("console.note");

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
            {/* A refused press is not a failure of the thing that is running, so it sits under
                that line rather than replacing it. */}
            {refused && <p className="mt-1.5 text-[12.5px] leading-relaxed text-warn">{refused}</p>}
            {hash && (
              <a
                href={txUrl(hash)}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-1 inline-block text-[12.5px] ${INLINE_LINK}`}
              >
                {t("explorer")}
              </a>
            )}
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 text-[12.5px] text-muted transition-colors hover:text-parchment"
            >
              {t("dismiss")}
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
 *
 * It is a hook rather than a plain function because the stage names, the action name and the
 * failure all come out of three different message namespaces, and every one of them belongs to
 * the language the screen is being read in.
 */
export function usePhaseNote(): (
  phase: Phase,
  label: ActionLabel | null,
  onDismiss: () => void,
  blockedBy?: ActionLabel | null,
) => ActionNoteProps {
  const note = useTranslations("console.note");
  const actions = useTranslations("console.actions");
  const errorText = useErrorText();

  return (phase, label, onDismiss, blockedBy) => {
    const refused = blockedBy ? note("busy", { label: actions(blockedBy.key, blockedBy.values) }) : null;

    if (phase.kind === "idle" || label === null) {
      return { tone: "working", text: null, hash: null };
    }

    const name = actions(label.key, label.values);

    if (phase.kind === "error") {
      return { tone: "bad", text: errorText(phase.error), hash: null, refused, onDismiss };
    }
    if (phase.kind === "done") {
      return {
        tone: "good",
        text: note("line", { label: name, state: note("done") }),
        hash: phase.hash,
        refused,
        onDismiss,
      };
    }
    const state = phase.kind === "decrypting" ? actions(phase.note) : note(phase.kind);
    return {
      tone: "working",
      text: note("line", { label: name, state }),
      hash: phase.kind === "mining" ? phase.hash : null,
      refused,
    };
  };
}
