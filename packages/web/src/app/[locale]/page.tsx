import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Landing } from "@/components/story/Landing";
import { LOCALE_CODES } from "@/i18n/routing";
import { findPool, resolvePoolSlug, type OpenPool } from "@/lib/chain/pools";
import { readAllGrandPrizes, readPoolStats } from "@/lib/chain/read";
import { alternates } from "@/lib/hreflang";

export const revalidate = 30;

export function generateStaticParams() {
  return LOCALE_CODES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: alternates("/", locale) };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // The landing page belongs to nobody in particular, so it shows the default pool's figures and
  // the whole shelf beside them. Reading the cookie here would make the page uncacheable for the
  // sake of a number the visitor has not asked for yet.
  const entry = findPool(resolvePoolSlug(null)) as OpenPool | null;
  const [stats, pools] = await Promise.all([
    entry && entry.status === "open" ? readPoolStats(entry) : Promise.resolve(null),
    readAllGrandPrizes(),
  ]);
  return <Landing stats={stats} pools={pools} />;
}
