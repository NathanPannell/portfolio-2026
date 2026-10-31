import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const site = 'https://www.nathanpannell.com';
const headers = readFileSync(join(dist, '_headers'), 'utf8');
assert.doesNotMatch(
  headers,
  /^\/\*\r?\n\s+Cache-Control:/m,
  'A global cache header would combine with asset-specific headers',
);

for (const pattern of [
  'https://:project.pages.dev/*',
  'https://:version.:project.pages.dev/*',
  'https://staging.nathanpannell.com/*',
]) {
  assert.match(
    headers,
    new RegExp(
      `${pattern.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\r?\\n\\s+X-Robots-Tag: noindex`,
    ),
  );
}
assert.doesNotMatch(headers, /https:\/\/www\.nathanpannell\.com\/\*\s+X-Robots-Tag:\s*noindex/);
assert.match(headers, /\/media\/\*\s+Cache-Control: public, max-age=86400, must-revalidate/);
assert.match(headers, /\/_astro\/\*\s+Cache-Control: public, max-age=31536000, immutable/);
assert.equal(
  (headers.match(/Cache-Control:/g) ?? []).length,
  2,
  'Only fingerprinted assets and stable media should set cache policy',
);

const canonical = (html) =>
  [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map((match) => match[1]);
const metadata = (html, name) =>
  html.match(new RegExp(`<meta (?:name|property)="${name}" content="([^"]+)"`))?.[1];
const schema = (html) => {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert(match, 'A JSON-LD graph must be emitted');
  return JSON.parse(match[1]);
};

const home = readFileSync(join(dist, 'index.html'), 'utf8');
const title = home.match(/<title>([^<]+)<\/title>/)?.[1] ?? '';
const description = metadata(home, 'description') ?? '';
assert(title.length >= 30 && title.length <= 60, `Title is ${title.length} characters`);
assert(
  description.length >= 120 && description.length <= 160,
  `Description is ${description.length} characters`,
);
assert.deepEqual(canonical(home), [`${site}/`]);
assert.equal(metadata(home, 'og:url'), `${site}/`);
assert.equal(metadata(home, 'og:image'), `${site}/og.jpg`);
assert.equal(metadata(home, 'og:image:width'), '1200');
assert.equal(metadata(home, 'og:image:height'), '630');
assert(metadata(home, 'og:image:alt'), 'The share image needs alt text');
assert.equal(metadata(home, 'twitter:card'), 'summary_large_image');
assert.equal(schema(home)['@graph'][0]['@type'], 'Person');
assert.equal(schema(home)['@graph'][1]['@type'], 'WebSite');
assert.match(home, /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/);

for (const file of [
  'og.jpg',
  'favicon.svg',
  'favicon-32.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'site.webmanifest',
  'robots.txt',
  'sitemap-index.xml',
]) {
  assert(existsSync(join(dist, file)), `Missing site file: ${file}`);
}

// The share card is a real JPEG of the size the metadata promises.
const card = readFileSync(join(dist, 'og.jpg'));
assert.equal(card.readUInt16BE(0), 0xffd8, 'og.jpg must be a JPEG');
assert(card.length < 300 * 1024, 'The share image should stay under 300 KB');

const notFound = readFileSync(join(dist, '404.html'), 'utf8');
assert.deepEqual(canonical(notFound), []);
assert.equal(metadata(notFound, 'robots'), 'noindex');
assert.doesNotMatch(readFileSync(join(dist, 'sitemap-0.xml'), 'utf8'), /\/404\/?</);

console.log('SEO contract passed: host exclusion, canonical, share card, structured data and 404.');
