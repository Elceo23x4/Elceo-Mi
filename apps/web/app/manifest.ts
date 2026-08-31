import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ELCEO',
    short_name: 'ELCEO',
    description: 'Premium market-cognition operating system',
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#050505',
    icons: [
      { src: '/pwa-icons/192', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-icons/512', sizes: '512x512', type: 'image/png' }
    ]
  };
}
