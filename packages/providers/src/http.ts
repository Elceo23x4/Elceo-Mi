export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Provider HTTP error ${response.status}: ${url}`);
  }
  return (await response.json()) as T;
}
