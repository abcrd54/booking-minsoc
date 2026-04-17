import type { MetadataRoute } from "next";

import { getSiteBaseUrl } from "@/lib/site-url";

const publicRoutes = [
  "",
  "/pembayaran",
  "/payment/finish",
  "/payment/unfinish",
  "/payment/error",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteBaseUrl();
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.6,
  }));
}
