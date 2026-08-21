import { createClient, type RedisClientType } from 'redis';
import type {
  ProviderCacheIdentity,
  ProviderCachePolicy,
  ProviderCachePublication,
  ProviderCacheRead,
  ProviderCacheStore,
  ProviderCachedMaterial,
  ProviderFlightState,
  ProviderSharedFailureReason,
} from './contracts';
import { validateCachedMaterial } from './material';

const READ = `
local raw=redis.call('GET',KEYS[1])
if not raw then return cjson.encode({state='MISS'}) end
local t=redis.call('TIME'); local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000)
local ok,e=pcall(cjson.decode,raw)
if not ok or e.entrySchemaVersion~='provider_cache_entry_v1' or not e.freshUntil or not e.staleUntil or not e.material then
  redis.call('DEL',KEYS[1]); return cjson.encode({state='INVALID'})
end
if now>tonumber(e.staleUntil) then redis.call('DEL',KEYS[1]); return cjson.encode({state='MISS'}) end
local state=now<=tonumber(e.freshUntil) and 'FRESH' or 'STALE_BUT_ELIGIBLE'
return '{"state":"'..state..'","entry":'..raw..'}'`;
const ACQUIRE = `
if redis.call('EXISTS',KEYS[1])==1 then return 0 end
redis.call('SET',KEYS[1],ARGV[1],'PX',ARGV[2]); redis.call('DEL',KEYS[2]); return 1`;
const RENEW = `if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('PEXPIRE',KEYS[1],ARGV[2]); return 1 end; return 0`;
const RELEASE = `if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end; return 0`;
const SUCCESS = `
if redis.call('GET',KEYS[1])~=ARGV[1] then return cjson.encode({published=false,reason='provider_singleflight_ownership_lost'}) end
local t=redis.call('TIME'); local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000)
local freshUntil=now+tonumber(ARGV[3]); local staleUntil=freshUntil+tonumber(ARGV[4])
local raw='{"entrySchemaVersion":"provider_cache_entry_v1","publishedAt":'..now..',"freshUntil":'..freshUntil..',"staleUntil":'..staleUntil..',"material":'..ARGV[2]..'}'
if string.len(raw)>tonumber(ARGV[5]) then
  redis.call('SET',KEYS[3],cjson.encode({state='failure',reason='provider_cache_entry_too_large',completedAt=now}),'PX',ARGV[6])
  redis.call('DEL',KEYS[1]); return cjson.encode({published=false,reason='provider_cache_entry_too_large'})
end
redis.call('SET',KEYS[2],raw,'PX',tonumber(ARGV[3])+tonumber(ARGV[4])); redis.call('DEL',KEYS[3]); redis.call('DEL',KEYS[1])
return '{"published":true,"entry":'..raw..'}'`;
const FAILURE = `
if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end
local t=redis.call('TIME'); local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000)
redis.call('SET',KEYS[2],cjson.encode({state='failure',reason=ARGV[2],completedAt=now}),'PX',ARGV[3]); redis.call('DEL',KEYS[1]); return 1`;

function keys(identity: ProviderCacheIdentity, namespace: string) {
  const tag = `{${identity.hash}}`;
  return {
    cache: `${namespace}:${tag}:cache`,
    flight: `${namespace}:${tag}:flight`,
    completion: `${namespace}:${tag}:completion`,
  };
}

export function createProviderCacheRedisClient(
  options: { url?: string; connectTimeoutMs?: number } = {},
): RedisClientType {
  const url = options.url ?? process.env.REDIS_URL;
  if (!url) throw new Error('provider_cache_control_unavailable');
  const client = createClient({
    url,
    socket: {
      connectTimeout: options.connectTimeoutMs ?? 3_000,
      reconnectStrategy: (attempts) => (attempts < 2 ? 100 : false),
    },
  }) as RedisClientType;
  client.on('error', () => undefined);
  return client;
}

export class RedisProviderCacheStore implements ProviderCacheStore {
  readonly kind = 'redis' as const;
  private connecting: Promise<unknown> | undefined;
  constructor(
    private readonly client: RedisClientType,
    private readonly namespace = 'elceo:provider-cache:v1',
    private readonly timeoutMs = 3_000,
  ) {}
  private async bounded<T>(promise: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error('provider_cache_command_timeout')), this.timeoutMs);
        }),
      ]);
    } finally {
      clearTimeout(timer!);
    }
  }
  private async ensure(): Promise<void> {
    if (this.connecting) await this.connecting;
    if (!this.client.isOpen) {
      this.connecting = this.bounded(this.client.connect()).finally(() => {
        this.connecting = undefined;
      });
      await this.connecting;
    }
    if (!this.client.isReady) throw new Error('provider_cache_control_unavailable');
  }
  async read(identity: ProviderCacheIdentity, policy: ProviderCachePolicy): Promise<ProviderCacheRead> {
    await this.ensure();
    const raw = JSON.parse(
      String(await this.bounded(this.client.eval(READ, { keys: [keys(identity, this.namespace).cache], arguments: [] }))),
    ) as ProviderCacheRead;
    if (raw.entry && !validateCachedMaterial(raw.entry.material, identity, policy)) return { state: 'INVALID' };
    return raw;
  }
  async tryAcquireFlight(identity: ProviderCacheIdentity, token: string, leaseMs: number): Promise<boolean> {
    await this.ensure();
    const scoped = keys(identity, this.namespace);
    return Number(await this.bounded(this.client.eval(ACQUIRE, { keys: [scoped.flight, scoped.completion], arguments: [token, String(leaseMs)] }))) === 1;
  }
  async renewFlight(identity: ProviderCacheIdentity, token: string, leaseMs: number): Promise<boolean> {
    await this.ensure();
    return Number(await this.bounded(this.client.eval(RENEW, { keys: [keys(identity, this.namespace).flight], arguments: [token, String(leaseMs)] }))) === 1;
  }
  async readFlightState(identity: ProviderCacheIdentity): Promise<ProviderFlightState> {
    await this.ensure();
    const scoped = keys(identity, this.namespace);
    const [active, completion] = await this.bounded(Promise.all([this.client.exists(scoped.flight), this.client.get(scoped.completion)]));
    return { active: active === 1, ...(completion ? { completion: JSON.parse(String(completion)) } : {}) };
  }
  async publishSuccessAndComplete(
    identity: ProviderCacheIdentity,
    token: string,
    material: ProviderCachedMaterial,
    policy: ProviderCachePolicy,
  ): Promise<ProviderCachePublication> {
    await this.ensure();
    const scoped = keys(identity, this.namespace);
    return JSON.parse(String(await this.bounded(this.client.eval(SUCCESS, {
      keys: [scoped.flight, scoped.cache, scoped.completion],
      arguments: [token, JSON.stringify(material), String(policy.freshTtlMs), String(policy.staleIfErrorTtlMs), String(policy.maxEntryBytes), String(policy.completionTtlMs)],
    })))) as ProviderCachePublication;
  }
  async publishFailureAndComplete(
    identity: ProviderCacheIdentity,
    token: string,
    reason: ProviderSharedFailureReason,
    ttlMs: number,
  ): Promise<boolean> {
    await this.ensure();
    const scoped = keys(identity, this.namespace);
    return Number(await this.bounded(this.client.eval(FAILURE, { keys: [scoped.flight, scoped.completion], arguments: [token, reason, String(ttlMs)] }))) === 1;
  }
  async releaseOwnerSafely(identity: ProviderCacheIdentity, token: string): Promise<boolean> {
    await this.ensure();
    return Number(await this.bounded(this.client.eval(RELEASE, { keys: [keys(identity, this.namespace).flight], arguments: [token] }))) === 1;
  }
  async close(): Promise<void> {
    if (this.client.isOpen) this.client.destroy();
  }
}
