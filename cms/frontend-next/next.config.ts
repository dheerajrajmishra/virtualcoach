import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
      {
        source: '/storage/:path*',
        destination: 'http://localhost:8080/storage/:path*',
      },
    ]
  },
};

export default nextConfig;
