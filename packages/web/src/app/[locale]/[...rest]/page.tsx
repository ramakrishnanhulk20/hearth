import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

/**
 * Every address that matches no other route.
 *
 * Without this, a mistyped URL never reaches a page at all, and Next answers with its own bare
 * 404 rather than the one this app writes: no header, no way back, and no language. Named routes
 * are more specific than a catch-all, so nothing that exists is affected by it.
 */
export default async function MissingRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  notFound();
}
