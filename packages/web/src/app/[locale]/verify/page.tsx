import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { VerifyScreen } from "@/components/verify/VerifyScreen";
import { poolFromRequest } from "@/lib/chain/pickPool";
import { alternates } from "@/lib/hreflang";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.verify" });
  return { title: t("title"), description: t("description"), alternates: alternates("/verify", locale) };
}

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <VerifyScreen pool={await poolFromRequest(searchParams)} />;
}
