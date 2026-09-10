import 'server-only';

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createConnection } from 'node:net';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { getPoolSnapshots, getRuntimePool } from '@elceo/db-runtime';

type PoolSnapshot = Awaited<ReturnType<typeof getPoolSnapshots>>[number];
type ResourceSample = {
  sampledAt: string;
  phase: 'baseline' | 'load' | 'recovery' | 'drain';
  cpuPercent: number;
  rssBytes: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  eventLoopDelayP95Ms: number;
  eventLoopDelayMaxMs: number;
  pools: PoolSnapshot[];
  ingestionBacklog: number | null;
  notificationBacklog: number | null;
  redisAvailable: boolean;
};

type SamplerArtifact = {
  testedHeadSha: string | null;
  pid: number;
  intervalMs: number;
  startedAt: string;
  completedAt: string | null;
  samples: ResourceSample[];
  peak: {
    cpuPercent: number;
    rssBytes: number;
    heapUsedBytes: number;
    eventLoopDelayP95Ms: number;
    eventLoopDelayMaxMs: number;
    systemPoolTotal: number;
    systemPoolWaiting: number;
    tenantPoolTotal: number;
    tenantPoolWaiting: number;
    ingestionBacklog: number;
    notificationBacklog: number;
  };
};

const numeric = (value: unknown): number => Number.isFinite(Number(value)) ? Number(value) : 0;

async function pingRedis(urlText: string | undefined): Promise<boolean> {
  if (!urlText) return false;
  let url: URL;
  try { url = new URL(urlText); } catch { return false; }
  if (!['redis:', 'rediss:'].includes(url.protocol) || url.protocol === 'rediss:') return false;
  return await new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    const socket = createConnection({ host: url.hostname, port: Number(url.port || 6379) });
    socket.setTimeout(500);
    socket.once('connect', () => socket.write('*1\r\n$4\r\nPING\r\n'));
    socket.once('data', (chunk) => finish(chunk.toString('utf8').startsWith('+PONG')));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

export function startSecGResourceSampler(): { stop: () => void; drain: () => Promise<void> } | null {
  const outputPath = process.env.SEC_G_RESOURCE_SAMPLE_PATH;
  if (process.env.APP_ENV !== 'test' || !outputPath) return null;

  const intervalMs = Math.max(250, Number(process.env.SEC_G_RESOURCE_SAMPLE_INTERVAL_MS ?? 1000));
  const histogram = monitorEventLoopDelay({ resolution: 20 });
  histogram.enable();
  const samples: ResourceSample[] = [];
  const startedAt = new Date().toISOString();
  let lastCpu = process.cpuUsage();
  let lastClock = process.hrtime.bigint();
  let stopped = false;
  let writing = Promise.resolve();

  const peak = {
    cpuPercent: 0,
    rssBytes: 0,
    heapUsedBytes: 0,
    eventLoopDelayP95Ms: 0,
    eventLoopDelayMaxMs: 0,
    systemPoolTotal: 0,
    systemPoolWaiting: 0,
    tenantPoolTotal: 0,
    tenantPoolWaiting: 0,
    ingestionBacklog: 0,
    notificationBacklog: 0
  };

  const persist = (completedAt: string | null = null) => {
    const artifact: SamplerArtifact = {
      testedHeadSha: process.env.SEC_G_HEAD_SHA ?? null,
      pid: process.pid,
      intervalMs,
      startedAt,
      completedAt,
      samples,
      peak
    };
    writing = writing.then(async () => {
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, JSON.stringify(artifact, null, 2));
    }).catch(() => undefined);
    return writing;
  };

  const takeSample = async (phase: ResourceSample['phase']) => {
    const nowClock = process.hrtime.bigint();
    const elapsedMicros = Number(nowClock - lastClock) / 1000;
    const cpu = process.cpuUsage(lastCpu);
    lastCpu = process.cpuUsage();
    lastClock = nowClock;
    const cpuPercent = elapsedMicros > 0 ? ((cpu.user + cpu.system) / elapsedMicros) * 100 : 0;
    const memory = process.memoryUsage();
    let ingestionBacklog: number | null = null;
    let notificationBacklog: number | null = null;
    try {
      const pool = await getRuntimePool('system');
      const result = await pool.query(`SELECT
        (SELECT count(*)::int FROM app_ingestion_outbox WHERE status IN ('pending','failed','publishing')) AS ingestion_backlog,
        (SELECT count(*)::int FROM app_notification_outbox WHERE status IN ('staged','failed','dispatching')) AS notification_backlog`);
      ingestionBacklog = numeric(result.rows[0]?.ingestion_backlog);
      notificationBacklog = numeric(result.rows[0]?.notification_backlog);
    } catch {
      ingestionBacklog = null;
      notificationBacklog = null;
    }
    const pools = await getPoolSnapshots().catch(() => []);
    const eventLoopDelayP95Ms = Number.isFinite(histogram.percentile(95)) ? histogram.percentile(95) / 1e6 : 0;
    const eventLoopDelayMaxMs = Number.isFinite(histogram.max) ? histogram.max / 1e6 : 0;
    histogram.reset();
    const sample: ResourceSample = {
      sampledAt: new Date().toISOString(),
      phase,
      cpuPercent,
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
      eventLoopDelayP95Ms,
      eventLoopDelayMaxMs,
      pools,
      ingestionBacklog,
      notificationBacklog,
      redisAvailable: await pingRedis(process.env.REDIS_URL)
    };
    samples.push(sample);
    peak.cpuPercent = Math.max(peak.cpuPercent, sample.cpuPercent);
    peak.rssBytes = Math.max(peak.rssBytes, sample.rssBytes);
    peak.heapUsedBytes = Math.max(peak.heapUsedBytes, sample.heapUsedBytes);
    peak.eventLoopDelayP95Ms = Math.max(peak.eventLoopDelayP95Ms, sample.eventLoopDelayP95Ms);
    peak.eventLoopDelayMaxMs = Math.max(peak.eventLoopDelayMaxMs, sample.eventLoopDelayMaxMs);
    peak.ingestionBacklog = Math.max(peak.ingestionBacklog, sample.ingestionBacklog ?? 0);
    peak.notificationBacklog = Math.max(peak.notificationBacklog, sample.notificationBacklog ?? 0);
    for (const pool of pools) {
      if (pool.role === 'system') {
        peak.systemPoolTotal = Math.max(peak.systemPoolTotal, pool.totalCount);
        peak.systemPoolWaiting = Math.max(peak.systemPoolWaiting, pool.waitingCount);
      } else {
        peak.tenantPoolTotal = Math.max(peak.tenantPoolTotal, pool.totalCount);
        peak.tenantPoolWaiting = Math.max(peak.tenantPoolWaiting, pool.waitingCount);
      }
    }
    await persist();
  };

  void takeSample('baseline');
  const timer = setInterval(() => { void takeSample('load'); }, intervalMs);
  timer.unref();

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
    },
    drain: async () => {
      if (!stopped) {
        stopped = true;
        clearInterval(timer);
      }
      await takeSample('drain');
      histogram.disable();
      await persist(new Date().toISOString());
    }
  };
}
