import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer", "cheerio", "rss-parser"],
};

export default nextConfig;
