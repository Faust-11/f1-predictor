import type { Metadata } from "next";
import { Inter, Titillium_Web } from "next/font/google";
import { cookies } from "next/headers";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toast";
import { THEME_COOKIE } from "@/lib/constants";
import { strings } from "@/lib/i18n/strings";
import "./globals.css";

const heading = Titillium_Web({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  variable: "--font-heading",
});

const body = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: {
    default: strings.app.title,
    template: `%s · ${strings.app.title}`,
  },
  description: strings.app.tagline,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const isDark = cookieStore.get(THEME_COOKIE)?.value === "dark";

  return (
    <html
      lang="uk"
      className={`${heading.variable} ${body.variable} h-full antialiased${isDark ? " dark" : ""}`}
    >
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
          {children}
        </main>
        <Footer />
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
