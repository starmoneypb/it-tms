import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  // Ensure static files are served correctly
  trailingSlash: false,
  // Configure asset prefix for production
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  // Enable standalone output for Docker optimization
  output: 'standalone',
};

export default withNextIntl(nextConfig);