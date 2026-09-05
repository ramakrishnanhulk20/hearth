import type { ReactNode } from "react";

/**
 * The console's ground.
 *
 * The data attribute is what carries the console's palette and its grain. Both live against that
 * selector in globals.css, so neither can be lost by editing a class list here.
 *
 * The wallet providers and the rail sit one level down, under the pool segment, because both of
 * them need to know which token the screens are about. This layer holds the routes that have not
 * chosen one yet: the redirect at /app, and the wait while a screen loads.
 */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <div data-surface="console" className="min-h-[100svh] bg-ink text-parchment antialiased">
      {children}
    </div>
  );
}
