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
  // Disable TypeScript incremental compilation for space-constrained builds
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  // SWC minification is enabled by default in Next.js 15
  // Configure Sass to use modern API
  sassOptions: {
    api: 'modern-compiler',
  },
  // Configure images to allow SVG files
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default withNextIntl(nextConfig);