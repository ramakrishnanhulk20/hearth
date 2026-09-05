import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { WithdrawScreen } from "@/components/app/withdraw/WithdrawScreen";
import { findPool } from "@/lib/chain/pools";
import { alternates } from "@/lib/hreflang";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; pool: string }>;
}): Promise<Metadata> {
  const { locale, pool } = await params;
  const entry = findPool(pool);
  const t = await getTranslations({ locale, namespace: "meta.withdraw" });
  return {
    title: entry ? t("title", { symbol: entry.symbol }) : t("titleFallback"),
    description: entry
      ? t("description", { symbol: entry.symbol, underlyingSymbol: entry.underlyingSymbol })
      : t("descriptionFallback"),
    alternates: alternates(`/app/${pool}/withdraw`, locale),
  };
}

export default async function WithdrawPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return <WithdrawScreen />;
}
