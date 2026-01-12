import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better performance and debugging
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rqdyfadbeafmunvmlqcp.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      {
        protocol: "https",
        hostname: "storage.keep-ph.com",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "54321",
        pathname: "/storage/v1/object/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600, // Cache optimized images for 1 hour
    // Optimize for mobile devices - prioritize smaller sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // Optimize bundle size - reduces JS execution time for heavy libraries
  // Next.js 14+ automatically tree-shakes these, but explicit inclusion ensures maximum efficiency
  experimental: {
    optimizePackageImports: [
      "@mantine/core",
      "@mantine/hooks",
      "@mantine/form",
      "@mantine/notifications",
      "@tabler/icons-react",
      "mantine-datatable",
      "recharts", // Optimize recharts imports for better tree-shaking
    ],
  },

  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Headers for better security, caching, and Lighthouse scores
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()", // Disable unused browser features for privacy/security
          },
        ],
      },
    ];
  },
};

export default nextConfig;
