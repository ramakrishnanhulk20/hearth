import { cookies } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { POOL_COOKIE, resolvePoolSlug } from "@/lib/chain/pools";

/**
 * /app has no token of its own, so it sends the saver to the one they were last saving in.
 *
 * A first visit lands on the default pool. Nothing is remembered until somebody picks a token,
 * and the cookie holds a slug that is checked against the deployed list before it is trusted.
 *
 * The redirect goes through the locale-aware helper, so a reader in Japanese lands on
 * /ja/app/usdc rather than being dropped back into English.
 */
export default async function AppEntryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const remembered = (await cookies()).get(POOL_COOKIE)?.value;
  redirect({ href: `/app/${resolvePoolSlug(remembered)}`, locale });
}
