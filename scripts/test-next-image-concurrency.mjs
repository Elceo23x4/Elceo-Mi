process.argv.push('--concurrency-only');
await import('./test-next-image-runtime.mjs');
