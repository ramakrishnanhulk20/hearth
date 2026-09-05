import type { ReactNode } from "react";
import { Providers } from "@/components/app/Providers";
import { ConsoleShell } from "@/components/app/console";

/**
 * The console shell, shared by every route under /app.
 *
 * Providers mount here and not on the pages, so moving between the dashboard, deposit, withdraw,
 * draws and run keeps one wagmi store, one query cache and one Zama SDK instance. Mounting them
 * per page would rebuild the SDK worker and drop the signed reveal permit on every click.
 *
 * The data attribute is what carries the console's palette and its grain. Both live against that
 * selector in globals.css, so neither can be lost by editing a class list here.
 */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <div data-surface="console" className="min-h-[100svh] bg-ink text-parchment antialiased">
      <Providers>
        <ConsoleShell>{children}</ConsoleShell>
      </Providers>
    </div>
  );
}
