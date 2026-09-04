import { createHash } from 'node:crypto';
import { createClient, type RedisClientType } from 'redis';

export interface LoginThrottle { check(account:string):Promise<boolean>; fail(account:string):Promise<void>; success(account:string):Promise<void>; close?():Promise<void>; }
const key=(account:string)=>`elceo:sec-b:login:account:${createHash('sha256').update(account.trim().toLowerCase()).digest('hex')}`;
const FAIL=`local n=redis.call('INCR',KEYS[1]);local ttl=60000;if n>5 then ttl=math.min(900000,60000*(2^(n-5))) end;redis.call('PEXPIRE',KEYS[1],ttl);return n`;

export class RedisLoginThrottle implements LoginThrottle {
  private client:RedisClientType; private connecting:Promise<unknown>|null=null;
  constructor(url:string){this.client=createClient({url,socket:{connectTimeout:3000,reconnectStrategy:false}});this.client.on('error',()=>undefined);}
  private async ready(){if(!this.client.isOpen)this.connecting??=this.client.connect().finally(()=>this.connecting=null);if(this.connecting)await this.connecting;if(!this.client.isReady)throw new Error('credentials_throttle_unavailable');}
  async check(account:string){await this.ready();return Number(await this.client.get(key(account))??0)<5;}
  async fail(account:string){await this.ready();await this.client.eval(FAIL,{keys:[key(account)],arguments:[]});}
  async success(account:string){await this.ready();await this.client.del(key(account));}
  async close(){if(this.client.isOpen)await this.client.quit();}
}

export class MemoryLoginThrottle implements LoginThrottle {
  private failures=new Map<string,number>();
  async check(account:string){return(this.failures.get(key(account))??0)<5;}
  async fail(account:string){const k=key(account);this.failures.set(k,(this.failures.get(k)??0)+1);}
  async success(account:string){this.failures.delete(key(account));}
}
