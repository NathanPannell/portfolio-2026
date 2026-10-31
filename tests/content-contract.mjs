import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function filesUnder(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const sources = filesUnder(join(root, 'src'));
const markup = sources
  .filter((path) => extname(path) === '.astro')
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n');

// Every world on the homepage, in the order the owner ranked them.
const worlds = ['ai-build-night', 'offbooked', 'parkdex', 'play-by-the-sandbox'];
let lastIndex = -1;
const page = readFileSync(join(root, 'src', 'pages', 'index.astro'), 'utf8');
for (const component of ['<Hero', '<BuildNight', '<Offbooked', '<Parkdex', '<Sandbox', '<Index']) {
  const index = page.indexOf(component);
  assert(index > lastIndex, `${component} must stay in its place on the homepage`);
  lastIndex = index;
}
for (const id of worlds) {
  assert(markup.includes(`id="${id}"`), `The homepage needs a #${id} section`);
}

// The links that matter. Each of these was checked by hand against the live product.
for (const url of [
  'https://aibuildnight.ca/',
  'https://aibuildnight.ca/pages/past-nights',
  'https://www.playbythesandbox.ca/',
  'https://offbooked.com/',
  'https://parkdex.app/',
  'https://web.parkdex.app/',
  'https://play.google.com/store/apps/details?id=app.parkdex',
]) {
  assert(markup.includes(url), `Missing outbound link: ${url}`);
}

// Offbooked is not on any store yet, and nothing can be bought. Neither may be implied.
const offbooked = readFileSync(join(root, 'src', 'components', 'Offbooked.astro'), 'utf8');
assert.doesNotMatch(offbooked, /apps\.apple\.com|play\.google\.com|testflight/i);
assert.doesNotMatch(offbooked, /C\$\d|\$\d/, 'No Offbooked price until payments ship');

// Cloudflare injects the analytics beacon once the Pages setting is on, so the source never adds one.
for (const path of sources) {
  assert.doesNotMatch(
    readFileSync(path, 'utf8'),
    /cloudflareinsights|data-cf-beacon/,
    `No analytics beacon in the source: ${relative(root, path)}`,
  );
}

// Parkdex must link the public listing, not the retired tester group.
assert.doesNotMatch(markup, /play\.google\.com\/apps\/testing/);

// The kept interaction: a row fills with a full-colour image, with a touch equivalent.
const index = readFileSync(join(root, 'src', 'components', 'Index.astro'), 'utf8');
assert.match(index, /\.wash-list li::before/);
assert.match(index, /\.wash-list li\[data-active\]::before/);
assert(existsSync(join(root, 'src', 'scripts', 'wash.ts')), 'The touch fill script must remain');

// A phone's address bar is what this offset is for, and test browsers can't show the difference.
assert.match(offbooked, /--bar: calc\(100lvh - 100svh\)/);

// The owner cut these, and they stay cut.
assert.doesNotMatch(offbooked, /two.actor/i, 'The two-actor test is gone');
assert.doesNotMatch(markup, /The one I’d bet on|got pulled for failing/, 'Unapproved public lines');

// Every world honours reduced motion with its own still layout.
for (const component of ['Hero', 'BuildNight', 'Sandbox', 'Offbooked', 'Parkdex', 'Index']) {
  const source = readFileSync(join(root, 'src', 'components', `${component}.astro`), 'utf8');
  assert.match(
    source,
    /prefers-reduced-motion: reduce/,
    `${component} needs a reduced-motion layout`,
  );
}

// Media exists and stays within a budget that keeps a heavy page loading quickly.
const budgets = { '.webp': 130 * 1024, '.mp4': 1.5 * 1024 * 1024 };
const media = filesUnder(join(root, 'public', 'media'));
assert(media.length > 0, 'The media folder must not be empty');
for (const path of media) {
  const extension = extname(path);
  const budget = budgets[extension];
  assert(budget, `${relative(root, path)} is not an allowed media format`);
  assert(statSync(path).size <= budget, `${relative(root, path)} is over its size budget`);
}

const referenced = new Set();
for (const path of sources) {
  const source = readFileSync(path, 'utf8');
  for (const match of source.matchAll(/\/media\/[\w./-]+\.(?:webp|mp4)/g)) referenced.add(match[0]);
}
for (const reference of referenced) {
  assert(existsSync(join(root, 'public', reference)), `Missing media file: ${reference}`);
}

const dist = join(root, 'dist');
if (existsSync(dist) && statSync(dist).isDirectory()) {
  const html = filesUnder(dist)
    .filter((path) => extname(path) === '.html')
    .map((path) => relative(dist, path).split(sep).join('/'))
    .sort();
  assert.deepEqual(html, ['404.html', 'index.html'], 'This is a one-page site plus a 404 page');
}

console.log(
  `Content contract passed: ${worlds.length} worlds, ${media.length} media files in budget.`,
);
