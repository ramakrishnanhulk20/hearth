import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CeremonyScreen } from "@/components/lab/Ceremony";
import { poolFromRequest } from "@/lib/chain/pickPool";
import { alternates } from "@/lib/hreflang";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.lab" });
  return {
    title: t("title"),
    description: t("description"),
    robots: { index: false, follow: false },
    alternates: alternates("/lab", locale),
  };
}

export default async function LabPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CeremonyScreen pool={await poolFromRequest(searchParams)} />;
}
