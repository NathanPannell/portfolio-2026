import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = join(root, 'src', 'content');

const expectedProjects = [
  'parkdex',
  'doxxme',
  'commons',
  'go-fetch',
  'cup-of-sugar',
];

const expectedWriting = [
  'graduation',
  'hackathon-learnings',
  'icbc-coop',
];

const expectedLegacy = [
  'cup-of-sugar',
  'echo',
  'go-fetch',
  'record-of-the-day',
  'suno-slayers',
];

const requiredFlatSlugs = [...expectedWriting, ...expectedLegacy];

function filesUnder(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function contentFiles(directory) {
  return filesUnder(directory).filter((path) => ['.md', '.mdx'].includes(extname(path)));
}

function parseFrontmatter(path) {
  const source = readFileSync(path, 'utf8');
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/);
  assert(match, `${relative(root, path)} must begin with YAML frontmatter`);

  const values = new Map();
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][\w-]*):\s*(.*?)\s*$/);
    if (field) values.set(field[1], field[2].replace(/^['"]|['"]$/g, ''));
  }
  return values;
}

function slugFor(path, directory) {
  return relative(directory, path)
    .split(sep)
    .join('/')
    .replace(/\.(md|mdx)$/u, '')
    .replace(/\/index$/u, '');
}

function isUnderscorePath(slug) {
  return slug.split('/').some((segment) => segment.startsWith('_'));
}

function collectionEntries(collection) {
  const directory = join(contentRoot, collection);
  return contentFiles(directory)
    .map((path) => ({ path, slug: slugFor(path, directory), data: parseFrontmatter(path) }));
}

function publicEntries(collection) {
  return collectionEntries(collection).filter(
    ({ slug, data }) => !isUnderscorePath(slug) && data.get('draft') !== 'true',
  );
}

function assertExact(actual, expected, label) {
  assert.deepEqual(
    [...actual].sort(),
    [...expected].sort(),
    `${label} changed. Update the explicit publishing contract deliberately if this is intended.`,
  );
}

const projects = publicEntries('projects');
const writing = publicEntries('writing');
const legacy = publicEntries('legacy');

assert.equal(projects.length, 5, 'Exactly five featured projects must be public');
assertExact(projects.map(({ slug }) => slug), expectedProjects, 'Featured project slugs');
assertExact(writing.map(({ slug }) => slug), expectedWriting, 'Writing slugs');
assertExact(legacy.map(({ slug }) => slug), expectedLegacy, 'Legacy post slugs');

const orderedProjects = projects
  .map(({ slug, data }) => ({ slug, order: Number(data.get('order')) }))
  .sort((a, b) => a.order - b.order);
assert.deepEqual(
  orderedProjects.map(({ slug }) => slug),
  expectedProjects,
  'Featured project order must remain Parkdex, Doxxme, Commons, Go Fetch, Cup of Sugar',
);
assert.deepEqual(
  orderedProjects.map(({ order }) => order),
  [1, 2, 3, 4, 5],
  'Featured project order values must be unique and contiguous',
);

const flatSlugs = [...writing, ...legacy].map(({ slug }) => slug);
assert.equal(new Set(flatSlugs).size, flatSlugs.length, 'Flat article slugs must be unique');
assertExact(flatSlugs, requiredFlatSlugs, 'Required flat article slugs');

for (const entry of [...projects, ...writing, ...legacy]) {
  assert.notEqual(entry.data.get('draft'), 'true', `${entry.slug} must not publish as a draft`);
  assert(!isUnderscorePath(entry.slug), `${entry.slug} must not expose an underscore path`);
}

const dist = join(root, 'dist');
if (existsSync(dist) && statSync(dist).isDirectory()) {
  const expectedRoutes = [...new Set([
    'index.html',
    'writing/index.html',
    ...expectedProjects.map((slug) => `${slug}/index.html`),
    ...requiredFlatSlugs.map((slug) => `${slug}/index.html`),
  ])];

  for (const route of expectedRoutes) {
    assert(existsSync(join(dist, ...route.split('/'))), `Missing generated route: /${route}`);
  }

  const generatedHtml = filesUnder(dist)
    .filter((path) => extname(path) === '.html')
    .map((path) => relative(dist, path).split(sep).join('/'));
  for (const route of generatedHtml) {
    assert(!isUnderscorePath(route), `Generated route exposes an underscore path: /${route}`);
  }

  for (const collection of ['projects', 'writing', 'legacy']) {
    const hiddenEntries = collectionEntries(collection).filter(
      ({ slug, data }) => isUnderscorePath(slug) || data.get('draft') === 'true',
    );
    for (const { slug } of hiddenEntries) {
      const route = `${slug}/index.html`;
      assert(!existsSync(join(dist, ...route.split('/'))), `Draft route was generated: /${route}`);
    }
  }
}

console.log(
  `Content contract passed: ${projects.length} featured projects, ${flatSlugs.length} flat articles, no public drafts.`,
);
