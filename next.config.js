/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
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

module.exports = nextConfig;