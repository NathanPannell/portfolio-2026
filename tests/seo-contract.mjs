import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const site = 'https://www.nathanpannell.com';
const headers = readFileSync(join(dist, '_headers'), 'utf8');
assert.doesNotMatch(headers, /^\/\*\r?\n\s+Cache-Control:/m, 'A global cache header would combine with asset-specific headers');

for (const pattern of ['https://:project.pages.dev/*', 'https://:version.:project.pages.dev/*', 'https://staging.nathanpannell.com/*']) {
  assert.match(headers, new RegExp(`${pattern.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\r?\\n\\s+X-Robots-Tag: noindex`));
}
assert.doesNotMatch(headers, /https:\/\/www\.nathanpannell\.com\/\*\s+X-Robots-Tag:\s*noindex/);
assert.match(headers, /\/media\/\*\s+Cache-Control: public, max-age=86400, must-revalidate/);
assert.match(headers, /\/_astro\/\*\s+Cache-Control: public, max-age=31536000, immutable/);
assert.equal((headers.match(/Cache-Control:/g) ?? []).length, 2, 'Only fingerprinted assets and stable media should set cache policy');

const page = (route) => readFileSync(join(dist, route === '/' ? 'index.html' : `${route.slice(1)}index.html`), 'utf8');
const canonical = (html) => [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map((match) => match[1]);
const metadata = (html, name) => html.match(new RegExp(`<meta (?:name|property)="${name}" content="([^"]+)"`))?.[1];
const schema = (html) => {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert(match, 'A JSON-LD graph must be emitted');
  return JSON.parse(match[1]);
};

const home = page('/');
assert.deepEqual(canonical(home), [`${site}/`]);
assert.equal(schema(home)['@graph'][0]['@type'], 'Person');
assert.equal(schema(home)['@graph'][1]['@type'], 'WebSite');
assert.match(home, /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/);

for (const route of ['parkdex', 'doxxme', 'commons', 'go-fetch', 'cup-of-sugar']) {
  const html = page(`/${route}/`);
  assert.deepEqual(canonical(html), [`${site}/${route}/`]);
  assert.match(html, /<img[^>]+width="\d+"[^>]+height="\d+"[^>]+fetchpriority="high"/);
  assert(metadata(html, 'og:image:alt'), `${route} needs social image alt text`);
}

for (const route of ['echo', 'record-of-the-day', 'suno-slayers', 'graduation', 'hackathon-learnings', 'icbc-coop']) {
  const html = page(`/${route}/`);
  const data = schema(html);
  const description = metadata(html, 'description');
  const socialImage = metadata(html, 'og:image');
  assert.deepEqual(canonical(html), [`${site}/${route}/`]);
  assert.equal(metadata(html, 'og:type'), 'article');
  assert(description && !description.startsWith('Nathan Pannell on '), `${route} needs a specific description`);
  assert(socialImage?.startsWith(`${site}/media/writing/`), `${route} needs a relevant social image`);
  assert(existsSync(join(dist, new URL(socialImage).pathname.slice(1))), `${route} social image must exist`);
  assert(metadata(html, 'og:image:alt'), `${route} social image needs alt text`);
  assert.equal(data['@type'], 'BlogPosting');
  assert.equal(data.description, description);
  assert.equal(data.image, socialImage);
  assert.equal(data.mainEntityOfPage, `${site}/${route}/`);
  assert.equal(data.author['@type'], 'Person');
  assert.equal(data.author.name, 'Nathan Pannell');
}

const notFound = readFileSync(join(dist, '404.html'), 'utf8');
assert.deepEqual(canonical(notFound), []);
assert.equal(metadata(notFound, 'robots'), 'noindex');
assert.doesNotMatch(readFileSync(join(dist, 'sitemap-0.xml'), 'utf8'), /\/404\/?</);

console.log('SEO contract passed: host exclusion, canonicals, structured data, covers, and 404.');
