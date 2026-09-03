/**
 * The console's text scale, written once and imported by every screen.
 *
 * Five screens built in parallel drifted to four body sizes and three label trackings, which is
 * the kind of difference nobody can name and everybody feels. These are the four recipes the
 * console actually needs, so a new screen has nothing to invent.
 */

/** The small uppercase name above a figure or a section. */
export const CAP_LABEL = "text-[11px] uppercase tracking-[0.12em] text-faint";

/** Explanatory prose inside a card. The one body size in the console. */
export const CARD_PROSE = "text-[13.5px] leading-relaxed text-muted";

/** The quieter line under a figure, a field or a card: a caveat, a rate, a cap. */
export const CARD_NOTE = "text-[12.5px] leading-relaxed text-faint";

/** What you hold, on the line under an amount field. */
export const BALANCE_LINE = "text-[13px] text-muted";

/** A link inside a sentence. Amber rather than yellow, which is unreadable on white. */
export const INLINE_LINK = "text-flameInk underline-offset-2 hover:underline";
