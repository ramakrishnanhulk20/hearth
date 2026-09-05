import type { Metadata } from "next";
import Link from "next/link";
import { getDocsIndex } from "@/lib/docs/content";
import { DocBody } from "./DocBody";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "How a draw works, how odds are computed, where the prize money comes from, what stays private, and every seam we know about.",
};

export default async function DocsIndexPage() {
  const { intro, sections, order } = await getDocsIndex();

  return (
    <div className="docs-page">
      <article className="docs-article">
        <p className="label mb-5">Documentation</p>
        <h1
          className="max-w-[15ch] font-display text-[clamp(2.1rem,6vw,3.6rem)] leading-[0.98] tracking-tightest text-parchment"
          style={{ fontWeight: 720 }}
        >
          The written record
        </h1>

        <div className="mt-6">
          <DocBody html={intro} />
        </div>

        <p className="mt-10 text-[12.5px] text-faint">
          {order.length} pages. Every one of them is a file in the repository under{" "}
          <code className="text-flame/75">docs/</code>, rendered here.
        </p>

        <div className="mt-8 flex flex-col gap-10">
          {sections.map((section) => (
            <section key={section.name} className="grid gap-3 lg:grid-cols-[9rem_minmax(0,1fr)] lg:gap-6">
              <h2 className="pt-3 text-[10.5px] uppercase tracking-label text-faint">{section.name}</h2>
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
                      <span className="shrink-0 text-[13px] text-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-flame">
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
