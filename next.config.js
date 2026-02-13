/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Allow importing TypeScript files without extension
    config.resolve.extensions = ['.tsx', '.ts', '.jsx', '.js', '.json'];
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'r2cdn.perplexity.ai',
      },
    ],
  },
}

module.exports = nextConfig
