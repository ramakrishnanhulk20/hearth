import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/app/console";
import { RunScreen } from "@/components/app/run/RunScreen";
import { alternates } from "@/lib/hreflang";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; pool: string }>;
}): Promise<Metadata> {
  const { locale, pool } = await params;
  const t = await getTranslations({ locale, namespace: "meta.run" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: alternates(`/app/${pool}/run`, locale),
  };
}

export default async function RunPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "run" });

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <RunScreen />
    </>
  );
}
