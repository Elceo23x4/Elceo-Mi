/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

export default nextConfig;
