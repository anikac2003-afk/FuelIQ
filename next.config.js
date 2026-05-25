/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.clerk.com',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'FuelIQ',
  },
};

module.exports = nextConfig;
