import type { MetadataRoute } from "next";

const ROUTES = ["", "/about", "/contact", "/privacy", "/support", "/deconstructor"];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((path) => ({
    url: `https://8020.best${path || "/"}`,
    changeFrequency: path ? "monthly" : "weekly",
    priority: path ? 0.7 : 1,
  }));
}
