import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["googleapis", "node-ical", "firebase-admin"],
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts", "framer-motion"],
    // Cache client-side navigations so going back to a visited page is instant
    staleTimes: {
      dynamic: 0,  // always fetch fresh data on client-side navigation
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
