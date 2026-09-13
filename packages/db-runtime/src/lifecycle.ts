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
  const deadline = Date.now() + graceMs;
  const failures: unknown[] = [];
  const bounded = async (work: () => Promise<unknown>, name: string) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error(`runtime_drain_timeout:${name}`);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { await Promise.race([work(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`runtime_drain_timeout:${name}`)), remaining); })]); }
    finally { if (timer) clearTimeout(timer); }
  };
  for (const entry of drains) {
    try { if (entry.stop) await bounded(() => Promise.resolve(entry.stop!()), `${entry.name}:stop`); }
    catch (error) { failures.push(error); }
  }
  for (const entry of [...drains].reverse()) {
    try { await bounded(() => entry.drain(), entry.name); }
    catch (error) { failures.push(error); }
  }
  if (failures.length) throw new AggregateError(failures, 'runtime_drain_failed');
}

/** Install once at the process composition root, never in individual repositories. */
export function installRuntimeSignalHandlers(): void {
  if (installed) return;
  installed = true;
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    const existing = process.listeners(signal);
    for (const listener of existing) process.removeListener(signal, listener);
    process.once(signal, () => {
      void drainRuntime().then(() => {
        if (!existing.length) return process.exit(0);
        for (const listener of existing) listener.call(process, signal);
        setTimeout(() => process.exit(0), Number(process.env.ELCEO_SHUTDOWN_GRACE_MS ?? 15000)).unref();
      }, () => process.exit(1));
    });
  }
}
