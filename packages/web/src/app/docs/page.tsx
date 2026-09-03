import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SmoothScroll } from "@/components/SmoothScroll";

export const metadata: Metadata = {
  title: "Documentation",
  description: "The map of Hearth's written record: how a draw works, what stays private, and what does not.",
};

const SECTIONS = [
  {
    name: "Getting started",
    pages: [
      {
        file: "getting-started/what-is-hearth.md",
        title: "What Hearth is",
        summary: "The product in one page: the four moves a saver makes, and exactly what each one hides.",
      },
      {
        file: "getting-started/try-it-on-sepolia.md",
        title: "Try it on Sepolia",
        summary:
          "Test ETH, the mock USDC faucet, shielding, depositing, a draw, revealing, claiming, withdrawing, unshielding.",
      },
    ],
  },
  {
    name: "Concepts",
    pages: [
      {
        file: "concepts/how-a-draw-works.md",
        title: "How a draw works",
        summary:
          "Periods, the two-period window and the close deadline, the five steps of a draw, and what the vault publishes instead of the pool's total.",
      },
      {
        file: "concepts/time-weighted-balance.md",
        title: "Time-weighted balance",
        summary:
          "Why odds use your average balance over the period, what a late deposit is worth, and why three saved observations are enough.",
      },
      {
        file: "concepts/winner-selection.md",
        title: "Winner selection",
        summary:
          "The winner test, PoolTogether's per-prize rule, the nested thresholds against the published bracket, and a worked example with three savers.",
      },
      {
        file: "concepts/prizes-and-tiers.md",
        title: "Prizes and tiers",
        summary:
          "How yield becomes prize liquidity, the encrypted carry and the reconcile cadence, the three Sepolia tiers, and where this deviates from PoolTogether V5.",
      },
      {
        file: "concepts/yield-source.md",
        title: "The yield source",
        summary:
          "The sponsored source on Sepolia, why the harvest is verified rather than reported, and how Zama's Confidential Vault plugs in on mainnet.",
      },
      {
        file: "concepts/why-zama.md",
        title: "Why Zama",
        summary: "The delete test: take fully homomorphic encryption out and there is no product left.",
      },
    ],
  },
  {
    name: "Security",
    pages: [
      {
        file: "security/what-stays-private.md",
        title: "What stays private",
        summary:
          "Seven rules: the bracket and the leak it replaced, what a pinned balance costs, the wrap seam in both directions, and the behavioural residual.",
      },
      {
        file: "security/threat-model.md",
        title: "Threat model",
        summary: "Nine attackers, what each wants, what stops them, and what does not.",
      },
      {
        file: "security/randomness-and-verification.md",
        title: "Randomness and verification",
        summary:
          "Where the seed comes from, why nobody can re-roll it or resize what it wins, and how anyone recomputes a threshold after the fact.",
      },
      {
        file: "security/static-analysis.md",
        title: "Static analysis",
        summary: "The slither and solhint runs, and the one reason behind each of the five families of findings.",
      },
    ],
  },
  {
    name: "Operations",
    pages: [
      {
        file: "operations/keeper.md",
        title: "The keeper",
        summary: "Its job step by step, the ordering rule, what happens when it is down, and the gas budget.",
      },
      {
        file: "operations/deploying.md",
        title: "Deploying",
        summary: "Deploy order, constructor signatures and parameters, verification, and Sepolia against mainnet.",
      },
    ],
  },
  {
    name: "Reference",
    pages: [
      {
        file: "limitations.md",
        title: "Limitations",
        summary: "Every documented limitation in one numbered list of fourteen.",
      },
      {
        file: "faq.md",
        title: "FAQ",
        summary: "Eleven short answers, including where the claim button went and why the pool publishes only a rough size.",
      },
    ],
  },
];

export default function DocsPage() {
  return (
    <main className="grain relative min-h-[100svh] bg-ink">
      <SmoothScroll />
      <SiteHeader />

      <div className="mx-auto w-full max-w-[60rem] px-4 pb-24 pt-10 sm:px-6">
        <p className="label mb-5">Documentation</p>
        <h1
          className="max-w-[18ch] font-display text-[clamp(2.1rem,6vw,4rem)] leading-[0.98] tracking-tightest text-parchment"
          style={{ fontWeight: 720 }}
        >
          The written record
        </h1>
        <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-muted">
          Sixteen pages covering how a draw works, how odds are computed, where the prize money comes
          from, and every seam we know about. They live in the repository under{" "}
          <code className="text-flame/80">docs/</code>, and each one is rendered here with its diagrams
          and search in the next update.
        </p>

        <div className="mt-12 flex flex-col gap-10">
          {SECTIONS.map((section) => (
            <section key={section.name}>
              <h2 className="text-[11px] uppercase tracking-label text-faint">{section.name}</h2>
              <div className="mt-3 flex flex-col">
                {section.pages.map((page) => (
                  <div key={page.file} className="border-b border-hairlineSoft py-3.5 last:border-b-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="text-[15px] text-parchment">{page.title}</h3>
                      <code className="text-[12px] text-faint">docs/{page.file}</code>
                    </div>
                    <p className="mt-1.5 max-w-[70ch] text-[13.5px] leading-relaxed text-muted">{page.summary}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
