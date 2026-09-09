declare module 'pg' {
  export class Pool {
    constructor(configuration: Record<string, unknown>);
  }
}
