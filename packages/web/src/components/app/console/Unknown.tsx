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
  reason = "This has not come back from the chain yet.",
  scale = "figure",
}: {
  reason?: string;
  /**
   * "figure" shrinks the word inside a 28px headline number. "inline" leaves it at the size of
   * the sentence around it, for a table cell or a balance line.
   */
  scale?: "figure" | "inline";
}) {
  return (
    <span
      className={`text-muted ${scale === "figure" ? "text-[0.62em] font-normal tracking-normal" : ""}`}
      title={reason}
    >
      unknown
    </span>
  );
}
