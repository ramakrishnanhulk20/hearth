import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import "./globals.css";

const display = Archivo({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lantern, prize savings nobody can see inside",
  description:
    "No-loss prize savings on Ethereum, with deposits, balances and winnings encrypted on chain. Win prizes drawn from yield, withdraw your principal whenever you like, and let nobody see how much you hold or what you won.",
  openGraph: {
    title: "Lantern",
    description: "Prize savings nobody can see inside.",
    type: "website",
  },
};

export const viewport: Viewport = {

  themeColor: "#000000",
};

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('lantern-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable}`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
