import type { ReactNode } from "react";
import { CAP_LABEL, CARD_NOTE } from "@/components/app/console";

/**
 * One small figure inside a draw card.
 *
 * The console's Stat is a 28px hero number, which is right for a dashboard and wrong for four
 * facts sitting in a row inside a card, so this is the table-cell sized version of the same idea.
 */
export function Fact({
  label,
  value,
  note,
}: {
  label: string;
  /** Pass Unknown when the read has not landed. A zero here would be a claim we cannot make. */
  value: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className={CAP_LABEL}>{label}</dt>
      <dd className="mt-1.5 text-[14px] leading-snug tabular-nums text-parchment">{value}</dd>
      {note && <dd className={`mt-1 ${CARD_NOTE}`}>{note}</dd>}
    </div>
  );
}
