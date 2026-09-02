"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LanguagePicker } from "@/components/LanguagePicker";
import { useMessages } from "@/i18n/LocaleProvider";

export default function HowItWorksPage() {
  const m = useMessages();

  return (
    <main className="force-dark relative min-h-[100svh] overflow-hidden bg-ink">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(50% 40% at 50% 0%, rgba(249,183,64,0.1), transparent 60%)," +
            "radial-gradient(60% 50% at 50% 120%, rgba(249,209,0,0.05), transparent 65%)",
        }}
      />

      <header className="relative z-20 mx-auto flex w-full max-w-[70rem] items-center justify-between px-6 py-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3" aria-label="Lantern, home">
          <LanternGlyph size={18} />
          <span className="font-display text-[18px] tracking-[-0.02em] text-parchment" style={{ fontWeight: 680 }}>
            Lantern
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            prefetch
            className="rounded-lg bg-flameFill px-4 py-2 text-sm font-medium text-onFlame transition-transform duration-200 hover:scale-[1.03]"
          >
            {m.nav.openApp}
          </Link>
          <LanguagePicker />
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-[52rem] px-6 pb-28 lg:px-8">
        <section className="fade-rise pt-10 text-center sm:pt-16">
          <p className="label mb-5 justify-center">A one-minute guide</p>
          <h1
            className="mx-auto max-w-[16ch] font-display text-[clamp(2.4rem,6.5vw,4.4rem)] leading-[0.98] tracking-tightest text-white"
            style={{ fontWeight: 720 }}
          >
            How Lantern works
          </h1>
          <p className="mx-auto mt-5 max-w-[46ch] text-[16px] leading-relaxed text-white/60">
            Save money together, win a prize at random, and never lose your deposit. The money is
            invisible. The fairness is not.
          </p>
        </section>

        <section className="mt-16 flex flex-col gap-3 sm:mt-20">
          <Step
            n={1}
            title="Put money in your lantern"
            body="Add any amount you like. The moment it lands it turns private, so only you can ever see how much is inside."
          />
          <Step
            n={2}
            title="Everyone saves together"
            body="Your lantern joins thousands of others in one pool. Every lantern glows, and not one of them can be read from the outside."
          />
          <Step
            n={3}
            title="A winner is drawn, in secret"
            body="Anyone can run the draw. One saver wins the prize, with better odds the more they have saved. The winner stays secret, even from the person who ran it, so it cannot be rigged."
          />
          <Step
            n={4}
            title="Peek to see if you won"
            body="Only you can look inside your own lantern. If your balance went up, you won. Nobody else is ever told a thing."
          />
          <Step
            n={5}
            title="Take your money out, anytime"
            body="Your savings are always yours. Withdraw in full whenever you want. You never lose your deposit; the prize was only ever a bonus on top."
            last
          />
        </section>

        <section className="fade-rise mt-20 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Panel title="What stays private" note="readable only by you" tone="private">
            <li>How much you have saved</li>
            <li>Your odds of winning</li>
            <li>Whether you won</li>
            <li>How much anyone has won</li>
          </Panel>
          <Panel title="What is public" note="so the pool can be trusted" tone="public">
            <li>The prize on offer</li>
            <li>That a draw happened</li>
            <li>The wallets that joined</li>
            <li>That the draw was fair</li>
          </Panel>
        </section>

        <section className="fade-rise mt-20 text-center">
          <p className="mx-auto max-w-[40ch] text-[15px] leading-relaxed text-white/55">
            You can watch a whole draw happen and still not say who won. That is the point, and it is
            the one thing only Zama&rsquo;s encryption makes possible.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/app"
              prefetch
              className="inline-flex items-center gap-2 rounded-lg bg-flameFill px-7 py-4 text-[15px] font-medium text-onFlame transition-transform duration-200 hover:scale-[1.02]"
            >
              {m.nav.openApp}
              <span aria-hidden>&rarr;</span>
            </Link>
            <Link href="/" className="text-[14px] text-white/55 transition-colors hover:text-white">
              Back to home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function Step({ n, title, body, last = false }: { n: number; title: string; body: string; last?: boolean }) {
  return (
    <div className="fade-rise relative flex gap-5" style={{ animationDelay: `${n * 90}ms` }}>
      
      <div className="relative flex flex-col items-center">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-flame/25 bg-flame/[0.06]">
          <span className="font-display text-[17px] text-flame" style={{ fontWeight: 660 }}>
            {n}
          </span>
        </div>
        {!last && <div className="mt-1 w-px flex-1 bg-gradient-to-b from-flame/25 to-transparent" />}
      </div>

      <div className={`glass-fill relative overflow-hidden rounded-panel border border-hairline p-5 ${last ? "" : "mb-3"} flex-1`}>
        <h2 className="font-display text-[19px] tracking-tight text-parchment" style={{ fontWeight: 640 }}>
          {title}
        </h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-white/60">{body}</p>
      </div>
    </div>
  );
}

function Panel({
  title,
  note,
  tone,
  children,
}: {
  title: string;
  note: string;
  tone: "private" | "public";
  children: ReactNode;
}) {
  return (
    <div className="glass-fill relative overflow-hidden rounded-panel border border-hairline p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-[16px] tracking-tight text-parchment" style={{ fontWeight: 640 }}>
          {title}
        </h3>
        <span className={`text-[11px] uppercase tracking-label ${tone === "private" ? "text-flame" : "text-white/40"}`}>
          {note}
        </span>
      </div>
      <ul
        className={`list-disc space-y-2.5 pl-[1.1rem] text-[14px] text-white/65 ${
          tone === "private" ? "marker:text-flame/60" : "marker:text-white/30"
        }`}
      >
        {children}
      </ul>
    </div>
  );
}

function LanternGlyph({ size = 18 }: { size?: number }) {
  return (
    <span className="relative block" style={{ height: size, width: (size * 13) / 18 }} aria-hidden>
      <span className="absolute inset-x-0 bottom-0 top-[3px] rounded-[3px] border border-flame/70 bg-flame/15" />
      <span className="absolute left-1/2 top-0 h-[5px] w-[7px] -translate-x-1/2 rounded-t-full border border-b-0 border-flame/70" />
    </span>
  );
}
