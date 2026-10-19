import { readFileSync } from 'node:fs';

const productionOrigin = 'https://www.nathanpannell.com';

/** Every route listed in the built sitemap, as a site-relative path. */
export function sitemapRoutes(): string[] {
  const sitemap = readFileSync(new URL('../dist/sitemap-0.xml', import.meta.url), 'utf8');
  const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => new URL(match[1] ?? '').pathname,
  );
  if (routes.length === 0) throw new Error('dist/sitemap-0.xml lists no routes');
  return routes;
}

/** Sources of Cloudflare `_redirects` rules, which `astro preview` does not apply. */
export function redirectSources(): Set<string> {
  const rules = readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8');
  return new Set(
    rules
      .split(/\r?\n/)
      .map((line) => line.trim().split(/\s+/)[0] ?? '')
      .filter((source) => source.startsWith('/')),
  );
}

/** Maps a same-site or production URL to a local URL, or returns null for external URLs. */
export function internalUrl(raw: string, base: string): URL | null {
  const url = new URL(raw, base);
  if (url.origin === new URL(base).origin) return url;
  if (url.origin === productionOrigin) return new URL(`${url.pathname}${url.hash}`, base);
  return null;
}
