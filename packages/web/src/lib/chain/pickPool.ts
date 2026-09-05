import "server-only";
import { cookies } from "next/headers";
import { findPool, POOL_COOKIE, resolvePoolSlug, type Pool } from "./pools";

/**
 * Which pool a page outside the console is about: the one in the query string, else the one the
 * saver last picked, else the default.
 *
 * Verify and the lab are linked from everywhere, including from outside the app, so a missing or
 * unknown parameter has to land somewhere real rather than on a 404.
 */
export async function poolFromRequest(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<Pool> {
  const asked = (await searchParams).pool;
  const wanted = Array.isArray(asked) ? asked[0] : asked;
  const remembered = (await cookies()).get(POOL_COOKIE)?.value;
  const slug = findPool(wanted) ? (wanted as string) : resolvePoolSlug(remembered);
  return findPool(slug) as Pool;
}
