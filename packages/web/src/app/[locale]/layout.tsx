import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LOCALE_CODES, localeEntry, routing } from "@/i18n/routing";
import { fontsFor } from "./fonts";
import "../globals.css";

export function generateStaticParams() {
  return LOCALE_CODES.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#050505",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: new URL("https://hearth.vercel.app"),
    title: {
      default: t("titleDefault"),
      template: t("titleTemplate", { title: "%s" }),
    },
    description: t("description"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "website",
      locale: localeEntry(locale).intl,
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
    },
  };
}

/**
 * The ground every page stands on, and the one place the language is settled.
 *
 * The script font for the locale is chosen here rather than in a page, because next/font has to be
 * called at the top of a module and the whole document has to carry the variable. English keeps
 * exactly the two faces it always had: Archivo for display and Inter for body. Every other script
 * appends its own face after those two, so a ticker, an address and the wordmark stay in the house
 * face in all sixteen languages while the sentences around them switch.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const entry = localeEntry(locale);
  const fonts = fontsFor(entry.script);

  return (
    <html
      lang={locale}
      dir={entry.dir}
      data-loose-display={fonts.displayLeading === null ? undefined : ""}
      className={fonts.className}
      style={
        {
          "--font-display": fonts.display,
          "--font-sans": fonts.sans,
          ...(fonts.displayLeading ? { "--display-leading": fonts.displayLeading } : {}),
        } as React.CSSProperties
      }
    >
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
