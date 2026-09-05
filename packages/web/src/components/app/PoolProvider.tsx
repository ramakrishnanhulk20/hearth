"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Pool } from "@/lib/chain/pools";
import { POOL_COOKIE } from "@/lib/chain/pools";

const PoolContext = createContext<Pool | null>(null);

/**
 * Which token the screens under it are about.
 *
 * Every read, write, figure and link inside the console belongs to one pool, and the route
 * segment is what chooses it. Carrying it in context rather than threading it through props keeps
 * the hooks looking the way they did when there was only one deployment.
 */
export function PoolProvider({ pool, children }: { pool: Pool; children: ReactNode }) {
  return <PoolContext.Provider value={pool}>{children}</PoolContext.Provider>;
}

export function useCurrentPool(): Pool {
  const pool = useContext(PoolContext);
  if (pool === null) {
    throw new Error("This screen reads a pool, so it has to be rendered inside PoolProvider.");
  }
  return pool;
}

/**
 * Remembers the pool for the next visit, so /app and the header links open where the saver was.
 *
 * It is written from the browser rather than by a server action because picking a token is a
 * navigation, not a mutation: nothing is signed, nothing is sent, and the page it lands on reads
 * the slug out of the URL either way.
 */
export function rememberPool(slug: string) {
  document.cookie = `${POOL_COOKIE}=${slug}; path=/; max-age=31536000; samesite=lax`;
}
