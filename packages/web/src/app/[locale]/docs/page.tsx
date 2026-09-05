import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LOCALE_CODES, localeEntry } from "@/i18n/routing";
import { getDocsIndex } from "@/lib/docs/content";
import { groupNumber } from "@/lib/format";
import { alternates } from "@/lib/hreflang";
import { DocBody } from "./DocBody";
import { sectionName } from "./sectionName";

export function generateStaticParams() {
  return LOCALE_CODES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.docs" });
  return { title: t("title"), description: t("description"), alternates: alternates("/docs", locale) };
}

export default async function DocsIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "docs" });
  const { intro, sections, order } = await getDocsIndex(locale);

  return (
    <div className="docs-page">
      <article className="docs-article">
        <p className="label mb-5">{t("kicker")}</p>
        <h1
          className="max-w-[15ch] font-display text-[clamp(2.1rem,6vw,3.6rem)] leading-[0.98] tracking-tightest text-parchment"
          style={{ fontWeight: 720 }}
        >
          {t("heading")}
        </h1>

        <div className="mt-6">
          <DocBody html={intro} />
        </div>

        <p className="mt-10 text-[12.5px] text-faint">
          {t.rich("count", {
            count: order.length,
            shown: groupNumber(localeEntry(locale).intl, order.length),
            path: (chunks) => <code className="text-flame/75">{chunks}</code>,
          })}
        </p>

        <div className="mt-8 flex flex-col gap-10">
          {sections.map((section) => (
            <section key={section.name} className="grid gap-3 lg:grid-cols-[9rem_minmax(0,1fr)] lg:gap-6">
              <h2 className="pt-3 text-[10.5px] uppercase tracking-label text-faint">
                {sectionName(t, section.name)}
              </h2>
              <div className="flex flex-col">
                {section.pages.map((page) => (
                  <Link
                    key={page.slug}
                    href={page.href}
                    className="group border-b border-hairlineSoft py-3.5 transition-colors last:border-b-0 hover:border-flame/30"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="text-[15px] text-parchment transition-colors group-hover:text-flame">
                        {page.title}
                      </h3>
                      <span className="shrink-0 text-[13px] text-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-flame rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5">
                        &rarr;
                      </span>
                    </div>
                    <p className="mt-1.5 max-w-[68ch] text-[13.5px] leading-relaxed text-muted">
                      {page.summary}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
