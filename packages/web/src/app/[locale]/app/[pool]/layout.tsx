import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Providers } from "@/components/app/Providers";
import { PoolProvider } from "@/components/app/PoolProvider";
import { UnsupportedToken } from "@/components/app/UnsupportedToken";
import { ConsoleShell } from "@/components/app/console";
import { findPool, POOLS } from "@/lib/chain/pools";

/** Only the tokens this build was deployed against have a screen. Anything else is a 404. */
export function generateStaticParams() {
  return POOLS.map((pool) => ({ pool: pool.slug }));
}

/**
 * The console shell, shared by every screen of one pool.
 *
 * Providers mount here and not on the pages, so moving between the dashboard, deposit, withdraw,
 * draws and run keeps one wagmi store, one query cache and one Zama SDK instance. Mounting them
 * per page would rebuild the SDK worker and drop the signed reveal permit on every click.
 *
 * A token Hearth cannot open a pool on never reaches its screens. It keeps its rail and its
 * picker and says why instead, because a saver who typed the address in deserves the reason
 * rather than a dashboard of dashes.
 */
export default async function PoolLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string; pool: string }>;
}) {
  const { locale, pool: slug } = await params;
  setRequestLocale(locale);
  const entry = findPool(slug);
  if (entry === null) notFound();

  return (
    <Providers>
      <PoolProvider pool={entry}>
        <ConsoleShell>{entry.status === "open" ? children : <UnsupportedToken />}</ConsoleShell>
      </PoolProvider>
    </Providers>
  );
}
