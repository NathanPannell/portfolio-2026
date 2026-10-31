import { expect, test } from '@playwright/test';
import { internalUrl, redirectSources, sitemapRoutes } from './routes';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Crawls every built page and checks each internal link, asset, and fragment it references.
test('no page references a broken internal URL', async ({ page, request, baseURL }) => {
  test.setTimeout(120_000);
  const base = baseURL ?? '';
  const redirects = redirectSources();
  const pages = [...sitemapRoutes(), '/404.html'];
  const references = new Map<string, Set<string>>();

  for (const route of pages) {
    await page.goto(route);
    const urls = await page.evaluate(() => {
      const values: string[] = [];
      const collect = (selector: string, name: string) =>
        document.querySelectorAll(selector).forEach((element) => {
          const value = element.getAttribute(name);
          if (value) values.push(value);
        });
      collect('a[href]', 'href');
      collect('link[href]', 'href');
      collect('img[src], video[src], source[src], script[src]', 'src');
      collect('video[poster]', 'poster');
      collect('video[data-src]', 'data-src');
      collect('meta[property="og:image"], meta[name="twitter:image"]', 'content');
      collect('meta[property="og:url"]', 'content');
      document.querySelectorAll('img[srcset], source[srcset]').forEach((element) => {
        for (const candidate of (element.getAttribute('srcset') ?? '').split(',')) {
          const url = candidate.trim().split(/\s+/)[0];
          if (url) values.push(url);
        }
      });
      document.querySelectorAll<HTMLElement>('[style*="url("]').forEach((element) => {
        for (const match of element.style.cssText.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
          if (match[1]) values.push(match[1]);
        }
      });
      return values;
    });

    for (const raw of urls) {
      if (/^(mailto|tel|javascript|data):/i.test(raw)) continue;
      const url = internalUrl(raw, new URL(route, base).href);
      if (!url) continue;
      const key = `${url.pathname}${url.hash}`;
      const sources = references.get(key) ?? new Set<string>();
      sources.add(route);
      references.set(key, sources);
    }
  }

  expect(references.size).toBeGreaterThan(pages.length);
  const broken: string[] = [];
  const bodies = new Map<string, string>();

  for (const [target, sources] of references) {
    const url = new URL(target, base);
    if (redirects.has(url.pathname)) continue;
    const from = [...sources].join(', ');
    let body = bodies.get(url.pathname);
    if (body === undefined) {
      const response = await request.get(url.pathname, { maxRedirects: 0 });
      if (response.status() !== 200) {
        broken.push(`${target} -> HTTP ${response.status()} (from ${from})`);
        continue;
      }
      const isHtml = (response.headers()['content-type'] ?? '').includes('text/html');
      body = isHtml ? await response.text() : '';
      bodies.set(url.pathname, body);
    }
    const fragment = decodeURIComponent(url.hash.slice(1));
    if (fragment && !new RegExp(`\\sid="${escapeRegExp(fragment)}"`).test(body)) {
      broken.push(`${target} -> missing #${fragment} (from ${from})`);
    }
  }

  expect(broken).toEqual([]);
});
