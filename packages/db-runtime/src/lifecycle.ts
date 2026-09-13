type Drain = { name: string; stop?: () => void | Promise<void>; drain: () => Promise<void> };
const drains: Drain[] = [];
let installed = false;
let shuttingDown = false;

export function registerRuntimeDrain(drain: Drain): () => void {
  drains.push(drain);
  return () => { const index = drains.indexOf(drain); if (index >= 0) drains.splice(index, 1); };
}

export async function drainRuntime(graceMs = Number(process.env.ELCEO_SHUTDOWN_GRACE_MS ?? 15000)): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  await Promise.allSettled(drains.map((entry) => entry.stop?.()));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('runtime_drain_timeout')), graceMs); });
  try { await Promise.race([Promise.allSettled([...drains].reverse().map((entry) => entry.drain())), timeout]); }
  finally { if (timer) clearTimeout(timer); }
}

/** Install once at the process composition root, never in individual repositories. */
export function installRuntimeSignalHandlers(): void {
  if (installed) return;
  installed = true;
  for (const signal of ['SIGTERM', 'SIGINT'] as const) process.once(signal, () => {
    void drainRuntime().then(() => process.exit(0), () => process.exit(1));
  });
}
