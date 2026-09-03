import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDocPage, getDocSlugs, getNeighbours } from "@/lib/docs/content";
import { DocBody } from "../DocBody";
import { Outline } from "../Outline";

export const dynamicParams = false;

type Params = { slug: string[] };

export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await getDocSlugs();
  return slugs.map((slug) => ({ slug: slug.split("/") }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getDocPage(slug.join("/"));
  if (!page) return {};

  return {
    title: page.title,
    description: page.summary,
  };
}

export default async function DocPageRoute({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const path = slug.join("/");
  const page = await getDocPage(path);
  if (!page) notFound();

  const { previous, next } = await getNeighbours(path);

  return (
    <div className="docs-page">
      <article className="docs-article">
        <p className="label mb-4">{page.section}</p>
        <h1
          className="max-w-[20ch] font-display text-[clamp(1.9rem,4.6vw,2.9rem)] leading-[1.02] tracking-tightest text-parchment"
          style={{ fontWeight: 700 }}
        >
          {page.title}
        </h1>
        {page.summary && (
          <p className="mt-4 max-w-[64ch] text-[15.5px] leading-relaxed text-muted">{page.summary}</p>
        )}

        <div className="mt-9">
          <DocBody html={page.html} />
        </div>

        {(previous || next) && (
          <nav className="docs-neighbours" aria-label="Nearby pages">
            {previous ? (
              <Link href={previous.href} className="docs-neighbour" data-side="previous">
                <span className="docs-neighbour-kicker">Previous</span>
                <span className="docs-neighbour-title">{previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={next.href} className="docs-neighbour" data-side="next">
                <span className="docs-neighbour-kicker">Next</span>
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
