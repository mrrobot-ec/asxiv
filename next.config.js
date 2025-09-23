/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  // Exclude test files from being treated as pages
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Exclude test files from being processed as pages
    config.module.rules.push({
      test: /\.(test|spec)\.(ts|tsx|js|jsx)$/,
      use: 'ignore-loader',
    });
    
    return config;
  },
};

module.exports = nextConfig;