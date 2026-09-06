const SENSITIVE_KEYS = new Set(['token', 'api_token', 'apikey', 'api_key', 'authorization', 'access_token', 'key']);

export function redactProviderHttpValue(value: string): string {
  let output = value;
  try {
    const parsed = new URL(value);
    for (const key of [...parsed.searchParams.keys()]) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) parsed.searchParams.set(key, '[REDACTED]');
    }
    output = parsed.toString();
  } catch { /* The value may be an error message rather than a URL. */ }
  output = output.replace(/([?&](?:token|api_token|apikey|api_key|authorization|access_token|key)=)[^&\s]+/gi, '$1[REDACTED]');
  return output;
}

function secretValues(url: string, init?: RequestInit): string[] {
  const values: string[] = [];
  try {
    const parsed = new URL(url);
    for (const [key, value] of parsed.searchParams) if (SENSITIVE_KEYS.has(key.toLowerCase()) && value) values.push(value);
  } catch { /* Invalid URLs are handled by fetch. */ }
  const headers = new Headers(init?.headers);
  for (const [key, value] of headers) if (SENSITIVE_KEYS.has(key.toLowerCase()) && value) values.push(value, value.replace(/^Bearer\s+/i, ''));
  return values.filter(Boolean).sort((a, b) => b.length - a.length);
}

function safeMessage(error: unknown, url: string, init?: RequestInit): string {
  let message = redactProviderHttpValue(error instanceof Error ? error.message : 'Provider request failed');
  for (const secret of secretValues(url, init)) message = message.split(secret).join('[REDACTED]');
  return message;
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {})
      },
      signal: init?.signal ?? controller.signal
    });

    if (!response.ok) {
      throw new Error(`Provider HTTP error ${response.status}: ${redactProviderHttpValue(url)}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    throw new Error(safeMessage(error, url, init));
  } finally {
    clearTimeout(timeout);
  }
}
