import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SmoothScroll } from "@/components/SmoothScroll";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Deposit confidential USDC, keep your balance encrypted, win prizes drawn from yield with odds set by your time-weighted balance, and withdraw whenever you like.",
};

const STEPS = [
  {
    title: "Wrap, then deposit",
    body: "Turn plain test USDC into confidential USDC, then put part of it into the pool. Wrapping is public and depositing is not, which is exactly why they are two buttons: doing both in one click publishes the size of your deposit to anyone reading the chain.",
  },
  {
    title: "Your odds are your average balance",
    body: "Not your balance at the moment of the draw, your balance across the whole period. Deposit five minutes before the period ends and you get one twelfth of the odds of having held the same amount all period. That is what stops somebody flashing a big balance in just before each draw and taking the prize.",
  },
  {
    title: "The draw closes, and a seed is drawn",
    body: "Prize sizes are fixed first, before any random number exists. Then the seed is generated as a ciphertext inside Zama's coprocessor, so nobody sees it when it is drawn and there is no second roll. When the period is over the seed is published with a signature the contract checks on chain.",
  },
  {
    title: "Everyone's result is already decided",
    body: "From the moment the seed is verified, the thresholds are public numbers anyone can recompute and the weights can no longer change. Evaluation just writes down what is already true, walking the saver list from a point the seed picked. Nobody chooses who is evaluated or in what order.",
  },
  {
    title: "You look, and only you",
    body: "Press Reveal and sign a message. That signature proves to Zama's relayer that you control the address, and it hands back the plaintext of values the contract granted you: your principal, your winnings, your weight and your credit for each draw. It costs no gas and writes nothing.",
  },
  {
    title: "Take it out whenever",
    body: "Withdrawals pay from winnings first, then principal, in one confidential transfer clamped on chain to what you hold. A claim is the same call with the same shape as any other withdrawal, so there is no transaction type that names the winners.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="grain relative min-h-[100svh] bg-ink">
      <SmoothScroll />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(50% 40% at 50% 0%, rgba(249,183,64,0.1), transparent 60%)," +
            "radial-gradient(60% 50% at 50% 120%, rgba(249,209,0,0.05), transparent 65%)",
        }}
      />

      <div className="relative z-10">
        <SiteHeader />

        <div className="mx-auto w-full max-w-[52rem] px-4 pb-24 sm:px-6">
          <section className="fade-rise pt-10 text-center sm:pt-16">
            <p className="label mb-5 justify-center">A two-minute guide</p>
            <h1
              className="mx-auto max-w-[16ch] font-display text-[clamp(2.1rem,6.5vw,4.4rem)] leading-[0.98] tracking-tightest text-parchment"
              style={{ fontWeight: 720 }}
            >
              How Hearth works
            </h1>
            <p className="mx-auto mt-5 max-w-[46ch] text-[16px] leading-relaxed text-muted">
              Save together, win a prize paid out of yield, and never lose your deposit. The money is
              invisible. The fairness is not.
            </p>
          </section>

          <section className="mt-14 flex flex-col gap-3 sm:mt-20">
            {STEPS.map((step, index) => (
              <Step
                key={step.title}
                n={index + 1}
                title={step.title}
                body={step.body}
                last={index === STEPS.length - 1}
              />
            ))}
          </section>

          <section className="fade-rise mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Panel title="Encrypted, readable only by you" note="your own values" tone="private">
              <li>Your principal</li>
              <li>Your unclaimed winnings</li>
              <li>Your time-weighted balance in every draw</li>
              <li>What each draw paid you, so whether you won</li>
            </Panel>
            <Panel title="Public, so the pool can be trusted" note="anyone can check" tone="public">
              <li>The seed of each draw, and its signature</li>
              <li>The bracket the draw ran against</li>
              <li>Each tier&apos;s prize size and liquidity</li>
              <li>How many prizes a tier paid, one draw later</li>
              <li>Which addresses deposited, and when</li>
            </Panel>
          </section>

          <section className="fade-rise mt-12 rounded-panel border border-hairline bg-[rgba(10,10,10,0.5)] p-5 sm:p-6">
            <h2 className="label">Named honestly: what leaks</h2>
            <ul className="mt-4 flex flex-col gap-3 text-[13.5px] leading-relaxed text-muted">
              <li>
                <span className="text-parchment">Wrapping and unwrapping are public.</span> Turning a
                public token into a confidential one is by definition a public act. If somebody can pin
                your balance, usually by watching a public wrap followed by a deposit of the same size,
                then your result in every draw from then on is public arithmetic, because the thresholds
                are public by design.
              </li>
              <li>
                <span className="text-parchment">Below three savers the bracket is nearly personal.</span>{" "}
                With one saver it is that saver&apos;s weight to within a factor of two. The app says so
                on the page when it happens.
              </li>
              <li>
                <span className="text-parchment">Each tier publishes how many prizes it paid,</span> one
                draw later, never to whom. That is the same step that returns unwon money to the public
                pot, which is what lets the jackpot accumulate where you can watch it. It slowly narrows
                a balance that never moves.
              </li>
              <li>
                <span className="text-parchment">The token is Zama&apos;s, and it is upgradeable.</span>{" "}
                Its owner can appoint observers able to decrypt every amount that moves through the
                token, retroactively. Hearth&apos;s own ledger is not readable by them, and the app
                shows a banner if an observer is ever appointed.
              </li>
            </ul>
          </section>

          <section className="fade-rise mt-12 text-center">
            <p className="mx-auto max-w-[42ch] text-[15px] leading-relaxed text-muted">
              You can watch a whole draw happen and still not say who won. That is the point, and it is
              the one thing only fully homomorphic encryption makes possible.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/app"
                prefetch
                className="inline-flex items-center gap-2 rounded-lg bg-flameFill px-6 py-3.5 text-[15px] font-medium text-onFlame transition-transform duration-200 hover:scale-[1.02]"
              >
                Open the pool
                <span aria-hidden>&rarr;</span>
              </Link>
              <Link href="/verify" className="text-[14px] text-muted transition-colors hover:text-parchment">
                Check a draw yourself
              </Link>
            </div>
          </section>
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}

function Step({ n, title, body, last = false }: { n: number; title: string; body: string; last?: boolean }) {
  return (
    <div className="fade-rise relative flex gap-4 sm:gap-5" style={{ animationDelay: `${n * 80}ms` }}>
      <div className="relative flex flex-col items-center">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-flame/25 bg-flame/[0.06] sm:h-12 sm:w-12">
          <span className="font-display text-[15px] text-flame sm:text-[17px]" style={{ fontWeight: 660 }}>
            {n}
          </span>
        </div>
        {!last && <div className="mt-1 w-px flex-1 bg-gradient-to-b from-flame/25 to-transparent" />}
      </div>

      <div
        className={`glass-fill relative overflow-hidden rounded-panel border border-hairline p-4 sm:p-5 ${last ? "" : "mb-3"} flex-1`}
      >
        <h2 className="font-display text-[17px] tracking-tight text-parchment sm:text-[19px]" style={{ fontWeight: 640 }}>
          {title}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{body}</p>
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
    <div className="glass-fill relative overflow-hidden rounded-panel border border-hairline p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-[16px] tracking-tight text-parchment" style={{ fontWeight: 640 }}>
          {title}
        </h3>
        <span className={`text-[11px] uppercase tracking-label ${tone === "private" ? "text-flame" : "text-faint"}`}>
          {note}
        </span>
      </div>
      <ul
        className={`list-disc space-y-2.5 pl-[1.1rem] text-[14px] text-muted ${
          tone === "private" ? "marker:text-flame/60" : "marker:text-white/30"
        }`}
      >
        {children}
      </ul>
    </div>
  );
}
