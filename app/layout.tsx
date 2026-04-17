import type { Metadata } from "next";
import Script from "next/script";
import { Manrope, Space_Grotesk } from "next/font/google";

import { fallbackSettings } from "@/lib/booking-data";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

async function getSiteMetadata() {
  if (!hasSupabaseEnv) {
    return fallbackSettings;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("app_settings")
      .select("venue_name, favicon_url, seo_title, seo_description, seo_keywords, google_analytics_id")
      .eq("id", 1)
      .maybeSingle();

    if (!data) {
      return fallbackSettings;
    }

    return {
      ...fallbackSettings,
      venueName: data.venue_name ?? fallbackSettings.venueName,
      faviconUrl: data.favicon_url ?? fallbackSettings.faviconUrl,
      seoTitle: data.seo_title ?? data.venue_name ?? fallbackSettings.venueName,
      seoDescription: data.seo_description ?? fallbackSettings.seoDescription,
      seoKeywords: data.seo_keywords ?? fallbackSettings.seoKeywords,
      googleAnalyticsId: data.google_analytics_id ?? fallbackSettings.googleAnalyticsId,
    };
  } catch {
    return fallbackSettings;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteMetadata();
  const title = settings.seoTitle || settings.venueName;
  const description = settings.seoDescription || fallbackSettings.seoDescription || "";
  const keywords = settings.seoKeywords?.split(",").map((item: string) => item.trim()).filter(Boolean) ?? [];

  return {
    title,
    description,
    keywords,
    applicationName: settings.venueName,
    authors: [{ name: settings.venueName }],
    creator: settings.venueName,
    publisher: settings.venueName,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title,
      description,
      siteName: settings.venueName,
      locale: "id_ID",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    icons: settings.faviconUrl
      ? {
          icon: settings.faviconUrl,
          shortcut: settings.faviconUrl,
          apple: settings.faviconUrl,
        }
      : undefined,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable}`}
        suppressHydrationWarning
      >
        {children}
        <AnalyticsSlot />
      </body>
    </html>
  );
}

async function AnalyticsSlot() {
  const settings = await getSiteMetadata();

  if (!settings.googleAnalyticsId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${settings.googleAnalyticsId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${settings.googleAnalyticsId}');
        `}
      </Script>
    </>
  );
}
