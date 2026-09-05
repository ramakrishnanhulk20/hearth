import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LOCALE_CODES } from "@/i18n/routing";
import { getDocPage, getDocSlugs, getNeighbours } from "@/lib/docs/content";
import { alternates } from "@/lib/hreflang";
import { DocBody } from "../DocBody";
import { Outline } from "../Outline";
import { sectionName } from "../sectionName";

type Params = { locale: string; slug: string[] };

export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await getDocSlugs();
  return LOCALE_CODES.flatMap((locale) => slugs.map((slug) => ({ locale, slug: slug.split("/") })));
}

/**
 * The page, or nothing.
 *
 * Every real page is built ahead of time from the list above, so the only requests that reach
 * this at run time are addresses that do not exist. The markdown tree is not deployed with the
 * server, and a missing tree throws rather than answering, which would turn a mistyped docs link
 * into a crash instead of a 404.
 */
async function readPage(locale: string, path: string) {
  try {
    return await getDocPage(locale, path);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const path = slug.join("/");
  const page = await readPage(locale, path);
  if (!page) return {};

  return {
    title: page.title,
    description: page.summary,
    alternates: alternates(`/docs/${path}`, locale),
  };
}

export default async function DocPageRoute({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "docs" });

  const path = slug.join("/");
  const page = await readPage(locale, path);
  if (!page) notFound();

  const { previous, next } = await getNeighbours(locale, path);

  return (
    <div className="docs-page">
      <article className="docs-article">
        <p className="label mb-4">{sectionName(t, page.section)}</p>
        <h1
          className="max-w-[20ch] font-display text-[clamp(1.9rem,4.6vw,2.9rem)] leading-[1.02] tracking-tightest text-parchment"
          style={{ fontWeight: 700 }}
        >
          {page.title}
        </h1>
        {page.summary && (
          <p className="mt-4 max-w-[64ch] text-[15.5px] leading-relaxed text-muted">{page.summary}</p>
        )}

        {/* Said before the prose rather than after it, because a reader who does not read English
            should find that out at the top of the page and not at the bottom of one. */}
        {page.englishFallback && <p className="docs-fallback">{t("fallbackNote")}</p>}

        <div className="mt-9">
          <DocBody html={page.html} />
        </div>

        {(previous || next) && (
          <nav className="docs-neighbours" aria-label={t("nearby")}>
            {previous ? (
              <Link href={previous.href} className="docs-neighbour" data-side="previous">
                <span className="docs-neighbour-kicker">{t("previous")}</span>
                <span className="docs-neighbour-title">{previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={next.href} className="docs-neighbour" data-side="next">
                <span className="docs-neighbour-kicker">{t("next")}</span>
                <span className="docs-neighbour-title">{next.title}</span>
              </Link>
            )}
          </nav>
        )}
      </article>

      <Outline headings={page.headings} />
    </div>
  );
}
