"use client";

import { Reveal } from "../Reveal";
import { SealedBars } from "@/components/app/ui";
import { useMessages } from "@/i18n/LocaleProvider";

export function CycleSection() {
  const m = useMessages();

  return (
    <section className="relative border-t border-hairlineSoft bg-ink py-28">
      <div className="mx-auto w-full max-w-[92rem] px-6 lg:px-10">
        <Reveal>
          <p className="label mb-6">{m.cycle.eyebrow}</p>
          <h2
            className="max-w-[20ch] font-display text-[clamp(2rem,5vw,4.2rem)] leading-[0.98] tracking-tightest text-parchment"
            style={{ fontWeight: 720 }}
          >
            {m.cycle.title}
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-hairlineSoft bg-hairlineSoft sm:grid-cols-2">
          {m.cycle.steps.map((step, i) => (
            <Reveal key={i} index={i} className="bg-ink">
              <div className="flex h-full flex-col gap-4 p-8 lg:p-10">
                <div className="flex items-center justify-between">
                  <span className="font-display text-[13px] tabular-nums tracking-label text-flame">
                    0{i + 1}
                  </span>
                  <span className="rounded-md border border-hairline px-2 py-1 text-[10px] uppercase tracking-label text-faint">
                    {step.tag}
                  </span>
                </div>
                <h3 className="font-display text-[26px] tracking-tight text-parchment" style={{ fontWeight: 640 }}>
                  {step.title}
                </h3>
                <p className="text-[14.5px] leading-relaxed text-muted">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HiddenSection() {
  const m = useMessages();

  return (
    <section className="relative border-t border-hairlineSoft bg-ink py-28" id="privacy">
      <div className="mx-auto w-full max-w-[92rem] px-6 lg:px-10">
        <Reveal>
          <p className="label mb-6">{m.hidden.eyebrow}</p>
          <h2
            className="max-w-[24ch] font-display text-[clamp(2rem,5vw,4.2rem)] leading-[0.98] tracking-tightest text-parchment"
            style={{ fontWeight: 720 }}
          >
            {m.hidden.title}
          </h2>
          <p className="mt-6 max-w-[54ch] text-[16px] leading-relaxed text-muted">{m.hidden.intro}</p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-panel border border-hairlineSoft bg-surface p-8 shadow-glass">
              <p className="mb-6 text-[11px] uppercase tracking-label text-faint">{m.hidden.encryptedHead}</p>
              <ul className="flex flex-col gap-4">
                {m.hidden.encrypted.map((item) => (
                  <li key={item} className="flex items-center justify-between gap-4 border-b border-hairlineSoft pb-4 last:border-0 last:pb-0">
                    <span className="text-[15px] text-parchment">{item}</span>
                    <SealedBars count={5} />
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal index={1}>
            <div className="h-full rounded-panel border border-flame/20 bg-surface p-8 shadow-glass">
              <p className="mb-6 text-[11px] uppercase tracking-label text-faint">{m.hidden.publicHead}</p>
              <ul className="flex flex-col gap-4">
                {m.hidden.publicItems.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-4 border-b border-hairlineSoft pb-4 last:border-0 last:pb-0">
                    <span className="text-[15px] text-parchment">{item.label}</span>
                    <span className="rounded-md border border-flame/30 px-2.5 py-1 text-[11px] uppercase tracking-label text-flame">
                      {item.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        <Reveal>
          <p className="mt-8 max-w-[70ch] text-[13.5px] leading-relaxed text-faint">{m.hidden.seam}</p>
        </Reveal>
      </div>
    </section>
  );
}

export function FairSection() {
  const m = useMessages();

  return (
    <section className="relative overflow-hidden border-t border-hairlineSoft bg-ink py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(249,209,0,0.08),transparent_65%)]"
      />
      <div className="relative mx-auto w-full max-w-[92rem] px-6 lg:px-10">
        <Reveal>
          <p className="label mb-8">{m.fair.eyebrow}</p>
          <h2
            className="max-w-[18ch] font-display text-[clamp(2.2rem,6vw,5.4rem)] leading-[0.95] tracking-tightest text-parchment"
            style={{ fontWeight: 740 }}
          >
            {m.fair.title}
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-3">
          {m.fair.cols.map((col, i) => (
            <Reveal key={i} index={i}>
              <p className="text-[15.5px] leading-relaxed text-muted">{col}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
