import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  
  // Redirects from ArXiv-style abstract URLs to PDF viewer
  async redirects() {
    return [
      {
        source: '/abs/:path*',
        destination: '/pdf/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
