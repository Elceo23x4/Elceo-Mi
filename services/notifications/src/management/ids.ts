export function buildDeterministicId(prefix: string, key: string): string {
  const normalized = key.replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${prefix}|${normalized}`.slice(0, 240);
}
