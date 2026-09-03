/**
 * The console's text scale, written once and imported by every screen.
 *
 * Five screens built in parallel drifted to four body sizes and three label trackings, which is
 * the kind of difference nobody can name and everybody feels. These are the four recipes the
 * console actually needs, so a new screen has nothing to invent.
 *
 * Two tones carry text and only two. Measured against every ground the console paints, white at
 * the faint token tops out at 4.67:1 and lands at 4.42:1 wherever a card's top glare lifts the
 * surface, so it cannot be the tone of anything a reader has to read. It keeps the jobs where
 * that bar does not apply: a placeholder, a disabled label, an icon at rest. Everything below is
 * at the muted tone, which measures 6.8:1 at the worst point on the surface.
 */

/** The small uppercase name above a figure or a section. */
export const CAP_LABEL = "text-[11px] uppercase tracking-[0.12em] text-muted";

/** Explanatory prose inside a card. The one body size in the console. */
export const CARD_PROSE = "text-[13.5px] leading-relaxed text-muted";

/** The quieter line under a figure, a field or a card: a caveat, a rate, a cap. */
export const CARD_NOTE = "text-[12.5px] leading-relaxed text-muted";

/** What you hold, on the line under an amount field. */
export const BALANCE_LINE = "text-[13px] text-muted";

/** A link inside a sentence, in the flame. Yellow on near-black clears 11:1, so it needs no help. */
export const INLINE_LINK = "text-flameInk underline-offset-2 hover:underline";
