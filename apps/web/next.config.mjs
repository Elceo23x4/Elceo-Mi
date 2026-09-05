import { sentryBrowserBuildEnv, sentryConnectSources } from './lib/sentry-dsn.mjs';
import { sentrySourceMapBuildOptions } from './lib/sentry-build-config.mjs';
import { withSentryConfig } from '@sentry/nextjs/config';

const connectSources = sentryConnectSources(process.env);
const sentryBrowserEnv = sentryBrowserBuildEnv(process.env);
const sentryBuildOptions = sentrySourceMapBuildOptions(process.env);

/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  {
    key: 'Content-Security-Policy',
    value:
      `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://cdn.onesignal.com; worker-src 'self' blob: https://cdn.onesignal.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src ${connectSources.join(' ')};`
  }
];

const nextConfig = {
  reactStrictMode: true,
  env: sentryBrowserEnv,
  outputFileTracingIncludes: {
    '/pwa-icons/*': ['./public/elceo/assets/source/retro_computer_logo.svg']
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/api/admin/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      { source: '/api/internal/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] }
    ];
  },
  transpilePackages: ['@elceo/ui', '@elceo/motion'],
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      gsap: new URL('./lib/vendor/gsap.ts', import.meta.url).pathname,
      'gsap/ScrollTrigger': new URL('./lib/vendor/scrollTrigger.ts', import.meta.url).pathname,
      three: new URL('./lib/vendor/three.ts', import.meta.url).pathname
    };
    return config;
  }
};

export default sentryBuildOptions
  ? withSentryConfig(nextConfig, sentryBuildOptions)
  : nextConfig;
