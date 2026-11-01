export const REPO = 'VirusPC/edges-brain-viruspc';
export const PAGES_ORIGIN = 'https://viruspc.github.io';
export const PAGES_BASE = '/edges-brain-viruspc';
export const PAGES_URL = `${PAGES_ORIGIN}${PAGES_BASE}/`;

const ASSET_EXT = /\.(xml|svg|html|txt|json|css|js|png|jpe?g|gif|webp|ico|pdf)$/i;

/** Site path including the configured Astro base. Static files keep their extension; pages gain a trailing slash. */
export function siteUrl(path = '/'): string {
  const base = import.meta.env.BASE_URL;
  if (!path || path === '/') return base;
  const clean = path.replace(/^\/+/, '').replace(/\/+$/, '');
  if (ASSET_EXT.test(clean)) return `${base}${clean}`;
  return `${base}${clean}/`;
}

export function githubBlob(sourcePath: string): string {
  const encoded = sourcePath
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `https://github.com/${REPO}/blob/main/${encoded}`;
}
