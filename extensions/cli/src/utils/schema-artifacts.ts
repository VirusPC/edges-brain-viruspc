import { readFileSync } from 'node:fs';

export type SchemaManifestEntry = { key: string; id: string; title: string; description: string; file: string };
const directory = new URL('../../dist/schemas/', import.meta.url);

function readArtifact(file: string): string {
  try { return readFileSync(new URL(file, directory), 'utf8'); }
  catch { throw new Error('Schema artifact missing or unreadable. Rebuild with pnpm --filter @viruspc/edges run build:schemas or reinstall @viruspc/edges.'); }
}

export function readSchemaManifest(): SchemaManifestEntry[] {
  return JSON.parse(readArtifact('manifest.json')) as SchemaManifestEntry[];
}

export function readSchemaArtifact(key: string): string {
  const entry = readSchemaManifest().find(entry => entry.key === key);
  if (!entry) throw new Error(`Unknown schema key: ${key}`);
  return readArtifact(entry.file);
}
