import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  
  async redirects() {
    return [
      {
        source: '/abs/:arxivId',
        destination: '/pdf/:arxivId',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
