"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * False on the server and on the client's very first render, true from then on.
 *
 * The chain reads resolve out of wagmi's cache, which can already hold a value while React is
 * still hydrating. The server has none, so it renders "unknown" while the client renders the
 * number, and React reports the mismatch. Holding every read as not-yet-landed for one render
 * makes both agree. useSyncExternalStore rather than an effect, because it is the one hook that
 * is allowed to answer differently on the server and the client without a cascading render.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, onClient, onServer);
}
