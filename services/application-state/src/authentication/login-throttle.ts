import { createHash } from 'node:crypto';
import { createClient, type RedisClientType } from 'redis';

export type ThrottleAdmission = { admitted: boolean; retryAfterMs: number };
export interface AttemptThrottle {
  admit(account: string): Promise<ThrottleAdmission>;
  success(account: string): Promise<void>;
  close?(): Promise<void>;
}
export type ThrottlePolicy = { namespace: string; limit: number; windowMs: number };
export const LOGIN_THROTTLE_POLICY: ThrottlePolicy = { namespace: 'login', limit: 5, windowMs: 60_000 };
export const RESET_THROTTLE_POLICY: ThrottlePolicy = { namespace: 'password-reset', limit: 3, windowMs: 15 * 60_000 };
const accountDigest = (account: string) => createHash('sha256').update(account.trim().toLowerCase()).digest('hex');
const ADMIT = `local count=tonumber(redis.call('GET',KEYS[1]) or '0');local ttl=redis.call('PTTL',KEYS[1]);if count>=tonumber(ARGV[1]) and ttl>0 then return {0,ttl,count} end;local next=redis.call('INCR',KEYS[1]);if next==1 then redis.call('PEXPIRE',KEYS[1],ARGV[2]);ttl=tonumber(ARGV[2]) else ttl=redis.call('PTTL',KEYS[1]) end;return {1,ttl,next}`;

export class RedisAttemptThrottle implements AttemptThrottle {
  private readonly client: RedisClientType;
  private connecting: Promise<unknown> | null = null;
  constructor(url: string, private readonly policy: ThrottlePolicy) {
    this.client = createClient({ url, socket: { connectTimeout: 3_000, reconnectStrategy: false } });
    this.client.on('error', () => undefined);
  }
  private async ready(): Promise<void> {
    if (!this.client.isOpen) this.connecting ??= this.client.connect().finally(() => { this.connecting = null; });
    if (this.connecting) await this.connecting;
    if (!this.client.isReady) throw new Error('credentials_throttle_unavailable');
  }
  private key(account: string): string { return `elceo:sec-b:${this.policy.namespace}:account:${accountDigest(account)}`; }
  async admit(account: string): Promise<ThrottleAdmission> {
    await this.ready();
    const result = await this.client.eval(ADMIT, { keys: [this.key(account)], arguments: [String(this.policy.limit), String(this.policy.windowMs)] }) as number[];
    return { admitted: result[0] === 1, retryAfterMs: Math.max(0, Number(result[1] ?? 0)) };
  }
  async success(account: string): Promise<void> { await this.ready(); await this.client.del(this.key(account)); }
  async close(): Promise<void> { if (this.client.isOpen) await this.client.quit(); }
}
export class RedisLoginThrottle extends RedisAttemptThrottle {
  constructor(url: string, policy: ThrottlePolicy = LOGIN_THROTTLE_POLICY) { super(url, policy); }
}
export class RedisPasswordResetThrottle extends RedisAttemptThrottle {
  constructor(url: string, policy: ThrottlePolicy = RESET_THROTTLE_POLICY) { super(url, policy); }
}

export class MemoryAttemptThrottle implements AttemptThrottle {
  private readonly windows = new Map<string, { count: number; expiresAt: number }>();
  constructor(private readonly policy: ThrottlePolicy, private readonly now: () => number = Date.now) {}
  async admit(account: string): Promise<ThrottleAdmission> {
    const key = accountDigest(account); const now = this.now(); let state = this.windows.get(key);
    if (!state || state.expiresAt <= now) { state = { count: 0, expiresAt: now + this.policy.windowMs }; this.windows.set(key, state); }
    if (state.count >= this.policy.limit) return { admitted: false, retryAfterMs: state.expiresAt - now };
    state.count += 1; return { admitted: true, retryAfterMs: state.expiresAt - now };
  }
  async success(account: string): Promise<void> { this.windows.delete(accountDigest(account)); }
}
export class MemoryLoginThrottle extends MemoryAttemptThrottle { constructor(policy: ThrottlePolicy = LOGIN_THROTTLE_POLICY, now?: () => number) { super(policy, now); } }
export class MemoryPasswordResetThrottle extends MemoryAttemptThrottle { constructor(policy: ThrottlePolicy = RESET_THROTTLE_POLICY, now?: () => number) { super(policy, now); } }
