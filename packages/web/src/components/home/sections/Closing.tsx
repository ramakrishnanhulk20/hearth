"use client";

import { Reveal } from "../Reveal";
import { useMessages } from "@/i18n/LocaleProvider";

const POOL_URL = `https://sepolia.etherscan.io/address/${process.env.NEXT_PUBLIC_LANTERN_POOL ?? ""}`;

export function ClosingSection() {
  const m = useMessages();
  return (
    <section className="relative overflow-hidden border-t border-hairlineSoft bg-ink py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_50%_120%,rgba(249,209,0,0.12),transparent_62%)]"
      />
      <div className="relative mx-auto flex w-full max-w-[92rem] flex-col items-center px-6 text-center lg:px-10">
        <Reveal>
          <LanternMark />
        </Reveal>
        <Reveal index={1}>
          <h2
            className="mt-10 max-w-[16ch] font-display text-[clamp(2.4rem,7vw,6rem)] leading-[0.92] tracking-tightest text-parchment"
            style={{ fontWeight: 760 }}
          >{m.closing.title}</h2>
        </Reveal>
        <Reveal index={2}>
          <p className="mt-6 max-w-[46ch] text-[16.5px] leading-relaxed text-muted">{m.closing.sub}</p>
        </Reveal>
        <Reveal index={3}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/app"
              className="group inline-flex items-center gap-2.5 rounded-lg bg-flameFill px-7 py-4 text-[15px] font-medium text-onFlame transition-transform duration-200 hover:scale-[1.02]"
            >{m.closing.openApp}
              <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
                &rarr;
              </span>
            </a>
            <a
              href={POOL_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-hairline px-7 py-4 text-[15px] text-parchment transition-colors duration-200 hover:border-hairlineStrong hover:bg-hover"
            >{m.closing.contract}</a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function LanternMark() {
  return (
    <span className="relative block h-16 w-12">
      <span className="absolute inset-x-0 bottom-0 top-[16%] rounded-[22%] border border-flame/50 bg-[linear-gradient(160deg,rgba(249,209,0,0.18),rgba(255,255,255,0.04)_55%,rgba(249,209,0,0.1))] shadow-flame" />
      <span className="absolute inset-x-[26%] top-[34%] bottom-[16%] rounded-[30%] bg-[radial-gradient(circle,rgba(255,216,77,0.6),transparent_72%)] blur-md" />
      <span className="absolute left-1/2 top-0 h-[16%] w-[26%] -translate-x-1/2 rounded-t-full border border-b-0 border-flame/50" />
    </span>
  );
}

export function SiteFooter() {
  const m = useMessages();
  const links = [
    { label: "GitHub", href: "https://github.com" },
    { label: m.closing.contract, href: POOL_URL },
    { label: "Zama Protocol", href: "https://www.zama.org" },
    { label: "PoolTogether", href: "https://pooltogether.com" },
  ];

  return (
    <footer className="border-t border-hairlineSoft bg-ink">
      <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-6 px-6 py-12 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div className="flex items-center gap-3">
          <span className="relative block h-[18px] w-[13px]">
            <span className="absolute inset-x-0 bottom-0 top-[3px] rounded-[3px] border border-flame/70 bg-flame/15" />
            <span className="absolute left-1/2 top-0 h-[5px] w-[7px] -translate-x-1/2 rounded-t-full border border-b-0 border-flame/70" />
          </span>
          <span className="font-display text-[15px] text-parchment" style={{ fontWeight: 640 }}>
            Lantern
          </span>
          <span className="text-[13px] text-faint">· {m.footer.tagline}</span>
        </div>

        <nav className="flex flex-wrap items-center gap-x-7 gap-y-2">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="text-[13px] text-muted transition-colors hover:text-parchment"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="mx-auto w-full max-w-[92rem] px-6 pb-10 lg:px-10">
        <p className="text-[12px] leading-relaxed text-faint">{m.footer.disclaimer}</p>
      </div>
    </footer>
  );
}
