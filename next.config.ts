import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/traitors-day/:path*",
        destination: "/day-of-deception/:path*",
        permanent: true,
      },
      {
        source: "/traitors-day",
        destination: "/day-of-deception",
        permanent: true,
      },
      {
        source: "/traitors",
        destination: "/day-of-deception",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
