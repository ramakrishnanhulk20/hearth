import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
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
  metadataBase: new URL("https://hearth.vercel.app"),
  title: {
    default: "Hearth, prize savings nobody can see inside",
    template: "%s | Hearth",
  },
  description:
    "Confidential no-loss prize savings on the Zama Protocol. Deposits, balances and winnings stay encrypted on chain, prizes are drawn from yield with odds proportional to your time-weighted balance, and principal comes back in full whenever you ask.",
  openGraph: {
    title: "Hearth",
    description: "Confidential no-loss prize savings on the Zama Protocol.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hearth",
    description: "Confidential no-loss prize savings on the Zama Protocol.",
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
