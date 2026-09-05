import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Link } from "@/i18n/navigation";
import { LOCALE_CODES } from "@/i18n/routing";
import { alternates } from "@/lib/hreflang";

export function generateStaticParams() {
  return LOCALE_CODES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.how" });
  return { title: t("title"), description: t("description"), alternates: alternates("/how", locale) };
}

const STEPS = ["one", "two", "three", "four", "five", "six"] as const;

export default async function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "how" });

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
            <p className="label mb-5 justify-center">{t("kicker")}</p>
            <h1
              className="mx-auto max-w-[16ch] font-display text-[clamp(2.1rem,6.5vw,4.4rem)] leading-[0.98] tracking-tightest text-parchment"
              style={{ fontWeight: 720 }}
            >
              {t("title")}
            </h1>
            <p className="mx-auto mt-5 max-w-[46ch] text-[16px] leading-relaxed text-muted">{t("lede")}</p>
          </section>

          <section className="mt-14 flex flex-col gap-3 sm:mt-20">
            {STEPS.map((step, index) => (
              <Step
                key={step}
                n={index + 1}
                title={t(`steps.${step}.title`)}
                body={t(`steps.${step}.body`)}
                last={index === STEPS.length - 1}
              />
            ))}
          </section>

          <section className="fade-rise mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Panel title={t("private.title")} note={t("private.note")} tone="private">
              <li>{t("private.one")}</li>
              <li>{t("private.two")}</li>
              <li>{t("private.three")}</li>
              <li>{t("private.four")}</li>
            </Panel>
            <Panel title={t("public.title")} note={t("public.note")} tone="public">
              <li>{t("public.one")}</li>
              <li>{t("public.two")}</li>
              <li>{t("public.three")}</li>
              <li>{t("public.four")}</li>
              <li>{t("public.five")}</li>
            </Panel>
          </section>

          <section className="fade-rise mt-12 rounded-panel border border-hairline bg-[rgba(10,10,10,0.5)] p-5 sm:p-6">
            <h2 className="label">{t("leaks.title")}</h2>
            <ul className="mt-4 flex flex-col gap-3 text-[13.5px] leading-relaxed text-muted">
              {(["one", "two", "three", "four"] as const).map((key) => (
                <li key={key}>
                  <span className="text-parchment">{t(`leaks.${key}Lead`)}</span> {t(`leaks.${key}Body`)}
                </li>
              ))}
            </ul>
          </section>

          <section className="fade-rise mt-12 text-center">
            <p className="mx-auto max-w-[42ch] text-[15px] leading-relaxed text-muted">{t("closing")}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/app"
                prefetch
                className="inline-flex items-center gap-2 rounded-lg bg-flameFill px-6 py-3.5 text-[15px] font-medium text-onFlame transition-transform duration-200 hover:scale-[1.02]"
              >
                {t("open")}
                <span aria-hidden className="rtl:-scale-x-100">
                  &rarr;
                </span>
              </Link>
              <Link href="/verify" className="text-[14px] text-muted transition-colors hover:text-parchment">
                {t("check")}
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
        className={`list-disc space-y-2.5 ps-[1.1rem] text-[14px] text-muted ${
          tone === "private" ? "marker:text-flame/60" : "marker:text-white/30"
        }`}
      >
        {children}
      </ul>
    </div>
  );
}
