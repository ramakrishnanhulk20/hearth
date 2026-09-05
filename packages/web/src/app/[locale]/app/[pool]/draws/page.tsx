import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DrawsScreen } from "@/components/app/draws/DrawsScreen";
import { alternates } from "@/lib/hreflang";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; pool: string }>;
}): Promise<Metadata> {
  const { locale, pool } = await params;
  const t = await getTranslations({ locale, namespace: "meta.draws" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: alternates(`/app/${pool}/draws`, locale),
  };
}

export default async function DrawsPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return <DrawsScreen />;
}
