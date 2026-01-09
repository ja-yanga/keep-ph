import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PERFORMANCE FIX: Optimize heavy libraries to reduce JS execution time
  experimental: {
    optimizePackageImports: [
      "@mantine/core",
      "@mantine/hooks",
      "@tabler/icons-react",
    ],
  },

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
  },
};

export default nextConfig;
