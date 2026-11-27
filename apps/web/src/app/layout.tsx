import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Crypto Markets",
  description: "Top cryptocurrencies by market cap",
};

// Stays a Server Component; only Providers (and below) ship as client code.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <nav aria-label="Main">
            <Link href="/" className="brand">
              Crypto Markets
            </Link>
          </nav>
        </header>
        <Providers>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
