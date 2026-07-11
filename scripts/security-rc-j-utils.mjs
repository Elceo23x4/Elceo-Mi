export const SECRET_PATTERNS = [/sk_(live|test)_[A-Za-z0-9]+/gi, /Bearer\s+[A-Za-z0-9._-]+/gi, /(password|secret|token|api[_-]?key)=([^\s&]+)/gi, /postgres(?:ql)?:\/\/[^\s]+/gi];
export function redact(value) { return String(value ?? '').replace(SECRET_PATTERNS[0], 'sk_$1_[REDACTED]').replace(SECRET_PATTERNS[1], 'Bearer [REDACTED]').replace(SECRET_PATTERNS[2], '$1=[REDACTED]').replace(SECRET_PATTERNS[3], 'postgres://[REDACTED]'); }
export function fail(message, extra) { console.error(redact(message)); if (extra) console.error(redact(JSON.stringify(extra))); process.exit(1); }
export function pass(message, extra) { console.log(redact(message)); if (extra) console.log(redact(JSON.stringify(extra, null, 2))); }
export function env(name) { return process.env[name]?.trim() || ''; }
export function sameUrl(a, b) { try { const x = new URL(a); const y = new URL(b); return x.origin.replace(/\/$/,'') === y.origin.replace(/\/$/,''); } catch { return a && b && a === b; } }
export function isLive(value) { return /^(live|production|prod|enabled|true)$/i.test(String(value || '')); }
export async function request(base, path, options = {}) { const controller = new AbortController(); const t = setTimeout(() => controller.abort(), 8000); try { return await fetch(new URL(path, base), { ...options, signal: controller.signal }); } finally { clearTimeout(t); } }
