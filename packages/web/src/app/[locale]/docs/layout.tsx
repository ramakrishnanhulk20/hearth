import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getDocsIndex } from "@/lib/docs/content";
import { DocsShell } from "./DocsShell";
import "./docs.css";

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const { sections, search } = await getDocsIndex();

  return (
    <main className="grain relative min-h-[100svh] bg-ink">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background: "radial-gradient(58% 34% at 22% 0%, rgba(249,183,64,0.08), transparent 62%)",
        }}
      />

      <div className="relative z-10 flex min-h-[100svh] flex-col">
        <SiteHeader />
        <div className="flex-1">
          <DocsShell sections={sections} search={search}>
            {children}
          </DocsShell>
        </div>
        <SiteFooter />
      </div>
    </main>
  );
}
