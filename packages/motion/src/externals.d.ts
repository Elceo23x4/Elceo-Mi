

declare module 'framer-motion' {
  export const motion: any;
  export function useReducedMotion(): boolean;
}

declare module 'react/jsx-runtime' {
  export const Fragment: any;
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
}

declare namespace JSX {
  interface Element {}
  interface ElementChildrenAttribute {
    children: unknown;
  }
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
