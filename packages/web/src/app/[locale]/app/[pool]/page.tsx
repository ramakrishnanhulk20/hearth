import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/app/console";
import { Dashboard } from "@/components/app/dashboard/Dashboard";
import { findPool } from "@/lib/chain/pools";
import { alternates } from "@/lib/hreflang";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; pool: string }>;
}): Promise<Metadata> {
  const { locale, pool } = await params;
  const entry = findPool(pool);
  const t = await getTranslations({ locale, namespace: "meta.dashboard" });
  return {
    title: entry ? t("title", { symbol: entry.symbol }) : t("titleFallback"),
    description: t("description"),
    alternates: alternates(`/app/${pool}`, locale),
  };
}

export default async function AppPage({ params }: { params: Promise<{ locale: string; pool: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard" });

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Dashboard />
    </>
  );
}
