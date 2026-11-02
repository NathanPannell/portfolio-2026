// Captures aibuildnight.ca for the main window in the AI Build Night section, which can't be an iframe
// because Shopify sends X-Frame-Options: DENY. Rerun this when the site changes, and look over the
// stops: `npm run capture:build-night`. See OPERATIONS.md.
//
// It writes the page in tiles to public/media/build-night/, and src/components/build-night-page.json,
// which says where each step stops. Each stop is found from the page itself, so a small change to the
// site moves it along, but a section that is renamed will fail here rather than stop in the wrong place.

import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { format, resolveConfig } from 'prettier';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const media = join(root, 'public', 'media', 'build-night');
const facts = join(root, 'src', 'components', 'build-night-page.json');
// Everything is written here first, so a capture that fails leaves the last good one in place.
const draft = mkdtempSync(join(tmpdir(), 'build-night-'));

const SITE = 'https://aibuildnight.ca/';
// Photos of people are held back until the owner clears them, so they're blurred past recognition
// before capture, and no stop rests on one. Set this to true once attendee permission is cleared.
const SHOW_PEOPLE = false;
const PEOPLE = '.hero img, #past img, #hosts img';
// Each tile's height in the capture's own pixels, and the most a tile can weigh.
const TILE = 1000;
const OVERLAP = 4;
const BUDGET = 125 * 1024;

// `from` is text on the page, and `by` how far above that text the window's top edge stops, so that
// each stop opens on a section's real content and clear of the site's sticky header.
const LAYOUTS = [
  {
    name: 'wide',
    viewport: { width: 1280, height: 800 },
    stops: [
      { from: 'Dear builder', by: 142 },
      { from: 'Night 002: a one-hour', by: 168 },
      { from: 'Stay off the keyboard', by: 67 },
      { end: true },
    ],
    // How tall the window can show of the page, in the page's pixels, at its tallest.
    view: 800,
  },
  {
    name: 'phone',
    viewport: { width: 430, height: 800 },
    isMobile: true,
    stops: [
      { from: 'Dear builder', by: 67 },
      { from: 'Pick your side', by: 76 },
      { from: 'Stay off the keyboard', by: 71 },
      { from: 'See you at the next one', by: 75 },
    ],
    view: 430,
  },
];

const topOf = (page, text) =>
  page.evaluate((words) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.textContent?.trim().startsWith(words)) {
        return Math.round((node.parentElement?.getBoundingClientRect().top ?? 0) + window.scrollY);
      }
    }
    return undefined;
  }, text);

const tileOf = async (image, name) => {
  for (let quality = 76; quality >= 30; quality -= 6) {
    const data = await image.webp({ quality, effort: 6 }).toBuffer();
    if (data.length <= BUDGET) {
      writeFileSync(join(draft, name), data);
      return data.length;
    }
  }
  throw new Error(`${name} can't fit its budget`);
};

const capture = async (browser, { name, viewport, isMobile = false, stops, view }) => {
  const context = await browser.newContext({
    viewport,
    isMobile,
    hasTouch: isMobile,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(SITE, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  // The hero's intro plays once, and everything further down fades in as it comes on screen.
  await page.waitForTimeout(4000);
  const tall = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let top = 0; top < tall; top += 300) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
  if (!SHOW_PEOPLE) {
    // Stops rather than risk a face: a photo the blur doesn't reach could be anyone.
    const loose = await page.evaluate(
      (people) =>
        [...document.images]
          .filter((image) => !image.matches(people) && !/\.svg(\?|$)/.test(image.currentSrc))
          .map((image) => image.currentSrc),
      PEOPLE,
    );
    if (loose.length > 0) throw new Error(`Photos the blur doesn't reach: ${loose.join(', ')}`);
    await page.addStyleTag({ content: `${PEOPLE} { filter: blur(14px) !important; }` });
  }
  await page.waitForTimeout(800);

  const headerHeight = await page.evaluate(
    () => document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0,
  );
  const places = [];
  for (const stop of stops) {
    if (stop.end) {
      places.push(tall - view);
      continue;
    }
    const top = await topOf(page, stop.from);
    if (top === undefined) throw new Error(`The page no longer says "${stop.from}"`);
    places.push(top - stop.by);
  }
  if (places.some((place) => place < 0 || place > tall - view)) {
    throw new Error(`A ${name} stop is off the page: ${places.join(', ')}`);
  }

  const shot = sharp(await page.screenshot({ fullPage: true }));
  const { width = 0, height = 0 } = await shot.metadata();
  await context.close();
  const scale = width / viewport.width;

  // Nothing above the first stop is ever seen, so it isn't kept.
  const start = Math.floor(Math.min(...places) * scale);
  const tiles = [];
  for (let top = start, index = 1; top < height; top += TILE, index += 1) {
    // Each runs a little under the next, so that no hairline can show between them at any scale.
    const size = Math.min(TILE + OVERLAP, height - top);
    const file = `${name}-${index}.webp`;
    const image = sharp(
      await shot.clone().extract({ left: 0, top, width, height: size }).toBuffer(),
    );
    const weight = await tileOf(image, file);
    tiles.push({ src: `/media/build-night/${file}`, top, height: size });
    console.log(file, width, size, weight);
  }
  const head = Math.round(headerHeight * scale);
  const bar = sharp(
    await shot.clone().extract({ left: 0, top: 0, width, height: head }).toBuffer(),
  );
  await tileOf(bar, `${name}-header.webp`);

  return {
    width,
    height,
    header: { src: `/media/build-night/${name}-header.webp`, height: head },
    tiles,
    // As a share of the page, so they hold at any size of window.
    stops: places.map((place) => Number(((place * scale * 100) / height).toFixed(3))),
    view: Number(((view * scale * 100) / height).toFixed(3)),
  };
};

const browser = await chromium.launch();
const page = {};
for (const layout of LAYOUTS) page[layout.name] = await capture(browser, layout);
await browser.close();

rmSync(media, { recursive: true, force: true });
cpSync(draft, media, { recursive: true });
rmSync(draft, { recursive: true, force: true });
const options = await resolveConfig(facts);
writeFileSync(facts, await format(JSON.stringify(page), { ...options, parser: 'json' }));
