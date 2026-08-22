import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.30.240.1", "localhost:3000"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
