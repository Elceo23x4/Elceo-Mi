import assert from 'node:assert/strict';
import { __resetOneSignalBrowserForTests, __synchronizeOneSignalSubscriptionForTests, detachOneSignalOnLogout, getOneSignalBrowserState } from '../lib/notifications/onesignal-browser-client.js';
import { startAuthenticatedNotificationLifecycle } from '../components/notifications/AuthenticatedNotificationLifecycle.js';
import { readFileSync } from 'node:fs';

const X='123e4567-e89b-42d3-a456-426614174000', Y='123e4567-e89b-42d3-a456-426614174001', Z='123e4567-e89b-42d3-a456-426614174002';
export async function runOneSignalBrowserClientTests(): Promise<void> {
  const originalFetch = globalThis.fetch;
  try {
    let calls: Array<{method:string;id:string}> = [];
    globalThis.fetch = async (_input, init) => { const id=(JSON.parse(String(init?.body)) as {subscriptionId:string}).subscriptionId; calls.push({method:String(init?.method),id}); return new Response('{}',{status:200}); };
    __resetOneSignalBrowserForTests(); await __synchronizeOneSignalSubscriptionForTests(X);
    assert.deepEqual(calls,[{method:'PUT',id:X}]); assert.equal(getOneSignalBrowserState().boundSubscriptionId,X);
    await __synchronizeOneSignalSubscriptionForTests(Y); assert.deepEqual(calls.slice(1),[{method:'DELETE',id:X},{method:'PUT',id:Y}]);
    calls=[]; __resetOneSignalBrowserForTests();
    await Promise.all([__synchronizeOneSignalSubscriptionForTests(X),__synchronizeOneSignalSubscriptionForTests(Y),__synchronizeOneSignalSubscriptionForTests(Z)]);
    assert.deepEqual(calls.map((call)=>`${call.method}:${call.id}`),[`PUT:${X}`,`DELETE:${X}`,`PUT:${Y}`,`DELETE:${Y}`,`PUT:${Z}`]); assert.equal(getOneSignalBrowserState().boundSubscriptionId,Z);
    for (const status of [401,500]) { __resetOneSignalBrowserForTests(); globalThis.fetch=async()=>new Response('{}',{status}); await assert.rejects(__synchronizeOneSignalSubscriptionForTests(X),/onesignal_backend_sync_failed/); assert.equal(getOneSignalBrowserState().boundSubscriptionId,null); }
    __resetOneSignalBrowserForTests(); globalThis.fetch=async()=>new Response('{}',{status:200}); await __synchronizeOneSignalSubscriptionForTests(X); calls=[];
    globalThis.fetch=async (_input,init)=>{const id=(JSON.parse(String(init?.body)) as {subscriptionId:string}).subscriptionId;calls.push({method:String(init?.method),id});return new Response('{}',{status:init?.method==='DELETE'?500:200});};
    await assert.rejects(__synchronizeOneSignalSubscriptionForTests(Y)); assert.equal(getOneSignalBrowserState().boundSubscriptionId,X); assert.deepEqual(calls,[{method:'DELETE',id:X}]);
    __resetOneSignalBrowserForTests(); globalThis.fetch=async()=>new Response('{}',{status:200}); await __synchronizeOneSignalSubscriptionForTests(X); calls=[];
    globalThis.fetch=async (_input,init)=>{const id=(JSON.parse(String(init?.body)) as {subscriptionId:string}).subscriptionId;calls.push({method:String(init?.method),id});return new Response('{}',{status:init?.method==='PUT'?500:200});};
    await assert.rejects(__synchronizeOneSignalSubscriptionForTests(Y)); assert.equal(getOneSignalBrowserState().boundSubscriptionId,null); assert.deepEqual(calls,[{method:'DELETE',id:X},{method:'PUT',id:Y}]);
    __resetOneSignalBrowserForTests(); globalThis.fetch=async()=>new Response('{}',{status:200}); await __synchronizeOneSignalSubscriptionForTests(X); globalThis.fetch=async()=>new Response('{}',{status:500}); await assert.rejects(detachOneSignalOnLogout(),/onesignal_backend_sync_failed/); assert.equal(getOneSignalBrowserState().boundSubscriptionId,X);
    let bootstrapCalls=0; startAuthenticatedNotificationLifecycle(async()=>{bootstrapCalls++;}); await Promise.resolve(); assert.equal(bootstrapCalls,1);
    const shell=readFileSync('components/shell/AppShellFrame.tsx','utf8'),root=readFileSync('app/layout.tsx','utf8'); assert.match(shell,/AuthenticatedNotificationLifecycle/); assert.doesNotMatch(root,/AuthenticatedNotificationLifecycle/);
  } finally { globalThis.fetch=originalFetch; __resetOneSignalBrowserForTests(); }
}
