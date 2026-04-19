declare module 'next-auth' {
  const NextAuth: (config: Record<string, unknown>) => {
    handlers: { GET: (request: Request) => Promise<Response>; POST: (request: Request) => Promise<Response> };
    auth: () => Promise<any>;
    signIn: (...args: unknown[]) => Promise<unknown>;
    signOut: (...args: unknown[]) => Promise<unknown>;
  };
  export default NextAuth;
}

declare module 'next-auth/providers/google' {
  const Google: (config: Record<string, unknown>) => unknown;
  export default Google;
}

declare module 'next-auth/providers/credentials' {
  const Credentials: (config: Record<string, unknown>) => unknown;
  export default Credentials;
}

declare module 'next-auth/react' {
  export function signIn(provider?: string, options?: Record<string, unknown>): Promise<{ error?: string; url?: string | null } | undefined>;
}

declare module 'next-auth/jwt' {
  export function getToken(input: { req: unknown; secret?: string }): Promise<{ sub?: string; role?: string } | null>;
}

declare module 'lightweight-charts' {
  export const CrosshairMode: { Magnet: number };
  export function createChart(container: HTMLElement, options: Record<string, unknown>): any;
}

declare module 'gsap' {
  export const gsap: {
    registerPlugin(...plugins: unknown[]): void;
    fromTo(targets: unknown, fromVars: Record<string, unknown>, toVars: Record<string, unknown>): void;
    to(targets: unknown, vars: Record<string, unknown>): void;
  };
}

declare module 'gsap/ScrollTrigger' {
  export const ScrollTrigger: {
    create(config: Record<string, unknown>): { kill(): void };
  };
}

declare module 'three' {
  export class Scene {
    add(object: unknown): void;
  }
  export class PerspectiveCamera {
    constructor(fov: number, aspect: number, near: number, far: number);
    position: { z: number };
    aspect: number;
    updateProjectionMatrix(): void;
  }
  export class WebGLRenderer {
    constructor(options?: Record<string, unknown>);
    domElement: HTMLElement;
    setPixelRatio(value: number): void;
    setSize(width: number, height: number): void;
    render(scene: Scene, camera: PerspectiveCamera): void;
    dispose(): void;
  }
  export class BufferGeometry {
    setAttribute(name: string, attribute: BufferAttribute): void;
    dispose(): void;
  }
  export class BufferAttribute {
    constructor(array: Float32Array, itemSize: number);
  }
  export class PointsMaterial {
    constructor(options: Record<string, unknown>);
    dispose(): void;
  }
  export class Points {
    constructor(geometry: BufferGeometry, material: PointsMaterial);
    rotation: { x: number; y: number };
  }
  export class AmbientLight {
    constructor(color: string, intensity?: number);
  }
  export class PointLight {
    constructor(color: string, intensity?: number, distance?: number);
    position: { set(x: number, y: number, z: number): void };
  }
  export const AdditiveBlending: number;
}

declare module 'react' {
  export type ReactNode = any;
  export type CSSProperties = Record<string, string | number | undefined>;
  export type FormEvent<T = Element> = { currentTarget: T; preventDefault(): void };
  export type ChangeEvent<T = Element> = { currentTarget: T };
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useRef<T>(initial: T): { current: T };
  export function useState<T>(initial: T | (() => T)): [T, (next: T | ((prev: T) => T)) => void];
  export function memo<T>(component: T): T;
}

declare namespace React {
  type FormEvent<T = Element> = { currentTarget: T; preventDefault(): void };
  type ChangeEvent<T = Element> = { currentTarget: T };
}

declare module 'react/jsx-runtime' {
  export const Fragment: any;
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
}

declare module 'pg' {
  export class Pool {
    constructor(config?: Record<string, unknown>);
    connect(): Promise<{ release(): void; query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> }>;
    query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  }
}

declare module 'kafkajs' {
  export class Kafka {
    constructor(config: Record<string, unknown>);
    producer(config?: Record<string, unknown>): any;
    consumer(config?: Record<string, unknown>): any;
  }
  export const logLevel: Record<string, number>;
}

declare module 'node:crypto' {
  export function createHmac(algorithm: string, key: string): { update(value: string): any; digest(encoding: 'hex' | 'base64'): string };
  export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
}

declare module 'node:fs/promises' {
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function readFile(path: string, encoding?: string): Promise<string>;
  export function writeFile(path: string, data: string, encoding?: string): Promise<void>;
  export function rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
}

declare module 'node:path' {
  export function dirname(path: string): string;
  export function join(...parts: string[]): string;
  export function resolve(...parts: string[]): string;
  export function relative(from: string, to: string): string;
  export function extname(path: string): string;
}

declare const process: {
  env: Record<string, string | undefined>;
  argv: string[];
};

declare const Buffer: {
  from(input: string, encoding?: string): Uint8Array & { length: number; toString(encoding?: string): string };
};

declare namespace JSX {
  interface Element {}
  interface ElementChildrenAttribute {
    children: unknown;
  }
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
