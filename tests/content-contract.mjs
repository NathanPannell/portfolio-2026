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
const worlds = [
  'ai-build-night',
  'offbooked',
  'parkdex',
  'play-by-the-sandbox',
  'not-quite-my-tempo',
];
let lastIndex = -1;
const page = readFileSync(join(root, 'src', 'pages', 'index.astro'), 'utf8');
for (const component of [
  '<Hero',
  '<BuildNight',
  '<Offbooked',
  '<Parkdex',
  '<Sandbox',
  '<Tempo',
  '<Index',
]) {
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
  'https://notquitemytempo-sand.vercel.app/',
  'https://play.google.com/store/apps/details?id=app.parkdex',
  'https://x.com/nathanwpannell',
]) {
  assert(markup.includes(url), `Missing outbound link: ${url}`);
}

// The game's domain isn't connected, so its link stays on Vercel.
assert.doesNotMatch(markup, /notquitemytempo\.com/, 'That domain is not connected');

// The owner's X handle changed, so the old one must not come back.
assert.doesNotMatch(markup, /x\.com\/nwpannell/, 'Old X handle');

// The owner took the Parkdex web app off this site.
assert.doesNotMatch(markup, /web\.parkdex\.app/, 'No link to the Parkdex web app');

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

// Frames, not pinned scroll: nothing is scrubbed, and the guide never relies on CSS snapping, which
// can strand a page on iOS Safari.
for (const path of sources) {
  const source = readFileSync(path, 'utf8');
  const name = relative(root, path);
  assert.doesNotMatch(source, /position: sticky|data-track/, `No pinned scenes: ${name}`);
  assert.doesNotMatch(source, /scroll-snap/, `No CSS snapping: ${name}`);
}

// Every section has its own thing to click, and it stays reachable by keyboard: a real button.
for (const [component, control] of [
  ['BuildNight', 'abn-key'],
  ['Offbooked', 'rope'],
  ['Parkdex', 'pk-plant'],
  ['Sandbox', 'sb-box__open'],
  ['Tempo', 'tp-tap'],
]) {
  const source = readFileSync(join(root, 'src', 'components', `${component}.astro`), 'utf8');
  assert.match(source, /\bdata-moment(?!-)/, `${component} needs a click moment`);
  assert.match(
    source,
    new RegExp(`<button\\s+class="${control}"[^>]*data-moment-control`),
    `${component}'s control must be a button`,
  );
}

// Only the visitor opens a scene: no timer, and nothing that opens one on the way past.
for (const script of ['moments.ts', 'tempo.ts']) {
  const source = readFileSync(join(root, 'src', 'scripts', script), 'utf8');
  assert.doesNotMatch(source, /setTimeout|IntersectionObserver|addEventListener\('scroll/);
}

// The owner chose Doors, so the hero toggle and the other options stay out.
assert.doesNotMatch(markup, /data-hero/, 'The hero toggle is gone');
assert.deepEqual(
  readdirSync(join(root, 'src', 'components', 'heroes')).sort(),
  ['Doors.astro', 'worlds.ts'],
  'Doors is the one hero',
);

// Each section says what it does in numbered steps, all on screen at once.
for (const component of ['BuildNight', 'Offbooked', 'Sandbox', 'Tempo']) {
  const source = readFileSync(join(root, 'src', 'components', `${component}.astro`), 'utf8');
  assert.match(source, /<Steps\b/, `${component} explains itself in steps`);
}

// The night's real schedule has about two hours of building, so it can't be called one hour.
const buildNight = readFileSync(join(root, 'src', 'components', 'BuildNight.astro'), 'utf8');
assert.doesNotMatch(buildNight, /one hour/i, 'A night is not an hour of building');

// The kept interaction: a row fills with a full-colour image, with a touch equivalent. The images
// are drawn for the row and pinned to its height, so `cover` can't crop them down to a strip.
const index = readFileSync(join(root, 'src', 'components', 'Index.astro'), 'utf8');
assert.match(index, /\.wash-list li::before/);
assert.match(index, /var\(--wash-image\) right var\(--wash-inset\) center \/ auto 100% no-repeat/);
assert.match(index, /\.wash-list li\[data-active\]::before/);
assert(existsSync(join(root, 'src', 'scripts', 'wash.ts')), 'The touch fill script must remain');

// A phone's address bar can't cover the ad if it fits the small viewport, and test browsers can't
// show the difference.
assert.match(offbooked, /\.ob-copy \{[^}]*height: 100svh/);

// The owner cut these, and they stay cut.
assert.doesNotMatch(offbooked, /two.actor/i, 'The two-actor test is gone');
assert.doesNotMatch(markup, /The one I’d bet on|got pulled for failing/, 'Unapproved public lines');
assert.doesNotMatch(markup, /Find a real person|grab a toy/, 'Sections the owner removed');
assert.doesNotMatch(markup, /data-audience|data-for[ >=]/, 'The audience label is gone');
for (const path of sources) {
  const name = relative(root, path);
  assert.doesNotMatch(readFileSync(path, 'utf8'), /\brivals\b/i, `Explorers now: ${name}`);
}
assert.doesNotMatch(offbooked, /class="(?:stamp|marquee|slab|script|tape|bubble)/, 'Tidied away');

// Every world honours reduced motion with its own still layout.
for (const component of [
  'Hero',
  'BuildNight',
  'Sandbox',
  'Offbooked',
  'Parkdex',
  'Tempo',
  'Index',
]) {
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
