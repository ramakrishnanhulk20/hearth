"use client";

import { usePinProgress } from "@/hooks/useScroll";
import { useMessages } from "@/i18n/LocaleProvider";

const STAKES = [7, 3, 14, 5, 22, 4, 9, 6, 17, 13];
const TOTAL = STAKES.reduce((a, b) => a + b, 0);
const MARKER = 62;

const WINNER = (() => {
  let acc = 0;
  for (let i = 0; i < STAKES.length; i++) {
    acc += STAKES[i];
    if (MARKER < acc) return i;
  }
  return STAKES.length - 1;
})();

export function DrawSection() {
  const m = useMessages();
  const { ref, step } = usePinProgress<HTMLDivElement>();

  return (
    <section ref={ref} className="relative h-[360vh] bg-ink" id="how">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="mx-auto w-full max-w-[92rem] px-6 lg:px-10">
          <p className="label mb-10">{m.draw.eyebrow}</p>

          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
            <div className="relative min-h-[8.5rem]">
              {m.draw.beats.map((beat, i) => (
                <div
                  key={i}
                  className={`absolute inset-0 transition-all duration-500 ${
                    i === step ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
                  }`}
                >
                  <p className="font-display text-[11px] tabular-nums tracking-label text-flame">
                    0{i + 1} / 04
                  </p>
                  <h2
                    className="mt-3 font-display text-[clamp(1.8rem,3.6vw,3rem)] leading-[1.02] tracking-tight text-parchment"
                    style={{ fontWeight: 680 }}
                  >
                    {beat.title}
                  </h2>
                  <p className="mt-4 max-w-[42ch] text-[15px] leading-relaxed text-muted">{beat.body}</p>
                </div>
              ))}
            </div>

            
            <div>
              <div className="relative">
                
                <div
                  className={`absolute -top-9 z-20 -translate-x-1/2 transition-opacity duration-500 ${
                    step >= 1 ? "opacity-100" : "opacity-0"
                  }`}
                  style={{ left: `${MARKER}%` }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="rounded-md border border-flame/40 bg-ink px-2 py-1 text-[10px] uppercase tracking-label text-flame">{m.draw.hiddenPoint}</span>
                    <span className="block h-3 w-px bg-flame/60" />
                  </div>
                </div>

                <div className="relative h-24 w-full overflow-hidden rounded-card border border-hairline bg-raised">
                  
                  <div className="flex h-full w-full">
                    {STAKES.map((stake, i) => (
                      <div
                        key={i}
                        style={{ width: `${(stake / TOTAL) * 100}%` }}
                        className={`relative h-full border-r border-hairlineSoft last:border-0 transition-colors duration-500 ${
                          step >= 3 && i === WINNER ? "bg-flame/[0.07]" : ""
                        }`}
                      >
                        
                        {i === WINNER && step >= 3 && (
                          <span
                            className="absolute inset-x-1 top-1/2 flex -translate-y-1/2 items-center justify-center gap-[2px]"
                            aria-label={m.draw.winnerSealed}
                          >
                            {Array.from({ length: 3 }).map((_, k) => (
                              <span key={k} className="block h-3 w-[6px] rounded-[1px] bg-flame/70" />
                            ))}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 border-r-2 border-flame bg-[linear-gradient(90deg,rgba(249,209,0,0.02),rgba(249,209,0,0.14))]"
                    style={{ width: "calc(var(--pin, 0) * 100%)" }}
                  />
                </div>

                <div className="mt-3 flex justify-between text-[11px] uppercase tracking-label text-faint">
                  <span>{m.draw.laidFlat}</span>
                  <span>{step >= 3 ? m.draw.winnerSealed : m.draw.sweeping}</span>
                </div>
              </div>

              {step >= 3 && (
                <p className="mt-6 text-[13px] leading-relaxed text-faint">{m.draw.closer}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
