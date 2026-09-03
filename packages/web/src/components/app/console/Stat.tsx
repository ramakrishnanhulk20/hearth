import type { ReactNode } from "react";
import { CAP_LABEL, CARD_NOTE } from "./typography";

/** One figure: what it is above, the number, then the sentence that stops it being misread. */
export function Stat({
  label,
  value,
  unit,
  note,
  accent = false,
}: {
  label: string;
  /** Pass Unknown when the read has not landed. A zero here would be a claim we cannot make. */
  value: ReactNode;
  unit?: string;
  note?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className={CAP_LABEL}>{label}</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span
          className={`font-display text-[28px] leading-none tabular-nums tracking-tight ${
            accent ? "text-flameInk" : "text-parchment"
          }`}
          style={{ fontWeight: 640 }}
        >
          {value}
        </span>
        {unit && <span className="text-[12.5px] text-faint">{unit}</span>}
      </p>
      {note && <p className={`mt-2 ${CARD_NOTE}`}>{note}</p>}
    </div>
  );
}
