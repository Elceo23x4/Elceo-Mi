'use client';

import { useEffect, useRef } from 'react';

type CinematicAtmosphereProps = {
  className?: string;
  variant?: 'landing' | 'auth' | 'shell';
};

export function CinematicAtmosphere({ className, variant = 'landing' }: CinematicAtmosphereProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!mountRef.current) return;

    let dispose = () => {};

    async function mount(): Promise<void> {
      const three = await import('../../lib/vendor/three');
      if (!mountRef.current) return;

      const width = mountRef.current.clientWidth || window.innerWidth;
      const height = mountRef.current.clientHeight || Math.max(320, window.innerHeight * 0.6);
      const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
      const lowPowerDevice = (navigator.hardwareConcurrency || 4) <= 4;

      const scene = new three.Scene();
      const camera = new three.PerspectiveCamera(58, width / height, 0.1, 1000);
      camera.position.z = 36;

      const renderer = new three.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.setSize(width, height);
      mountRef.current.appendChild(renderer.domElement);

      const baseCount = variant === 'landing' ? 680 : 380;
      const particleCount = lowPowerDevice || coarsePointer ? Math.floor(baseCount * 0.48) : baseCount;
      const positions = new Float32Array(particleCount * 3);
      const spread = variant === 'landing' ? 40 : 28;

      for (let i = 0; i < particleCount; i += 1) {
        positions[i * 3] = (Math.random() - 0.5) * spread;
        positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
        positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
      }

      const geometry = new three.BufferGeometry();
      geometry.setAttribute('position', new three.BufferAttribute(positions, 3));

      const palette =
        variant === 'auth'
          ? { main: '#f06f77', accent: '#8de6c2' }
          : variant === 'shell'
            ? { main: '#da646e', accent: '#89d4b6' }
            : { main: '#ff6f7a', accent: '#8df2cb' };

      const material = new three.PointsMaterial({
        color: palette.main,
        size: variant === 'landing' ? 0.11 : 0.09,
        transparent: true,
        opacity: 0.44,
        blending: three.AdditiveBlending
      });

      const points = new three.Points(geometry, material);
      scene.add(points);

      const ambient = new three.AmbientLight(palette.main, 0.36);
      scene.add(ambient);

      const rim = new three.PointLight(palette.accent, 0.95, 140);
      rim.position.set(14, 10, 18);
      scene.add(rim);

      let raf = 0;
      const animate = () => {
        raf = requestAnimationFrame(animate);
        points.rotation.y += variant === 'landing' ? 0.0008 : 0.00055;
        points.rotation.x += 0.00018;
        renderer.render(scene, camera);
      };

      animate();

      const onVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          cancelAnimationFrame(raf);
          return;
        }
        animate();
      };

      const onResize = () => {
        if (!mountRef.current) return;
        const nextWidth = mountRef.current.clientWidth || window.innerWidth;
        const nextHeight = mountRef.current.clientHeight || Math.max(320, window.innerHeight * 0.6);
        camera.aspect = nextWidth / nextHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(nextWidth, nextHeight);
      };

      window.addEventListener('resize', onResize);
      document.addEventListener('visibilitychange', onVisibilityChange);

      dispose = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        mountRef.current?.contains(renderer.domElement) && mountRef.current.removeChild(renderer.domElement);
      };
    }

    void mount();

    return () => dispose();
  }, [variant]);

  return <div className={className ? `elceo-cinematic-atmosphere ${className}` : 'elceo-cinematic-atmosphere'} ref={mountRef} aria-hidden="true" />;
}
