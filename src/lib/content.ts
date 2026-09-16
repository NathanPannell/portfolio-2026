import { getCollection, type CollectionEntry } from 'astro:content';

type RoutableEntry = {
  id: string;
  data: { draft?: boolean };
};

export function isRoutableEntry(entry: RoutableEntry): boolean {
  const pathSegments = entry.id.replaceAll('\\', '/').split('/');
  return !entry.data.draft && pathSegments.every((segment) => !segment.startsWith('_'));
}

export async function getPublishedWriting(): Promise<CollectionEntry<'writing'>[]> {
  const entries = await getCollection('writing', isRoutableEntry);
  return entries.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getLegacyPosts(): Promise<CollectionEntry<'legacy'>[]> {
  const entries = await getCollection('legacy', isRoutableEntry);
  return entries.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getProjects(): Promise<CollectionEntry<'projects'>[]> {
  const entries = await getCollection('projects', isRoutableEntry);
  return entries.sort((a, b) => a.data.order - b.data.order);
}

export async function getProject(slug: string): Promise<CollectionEntry<'projects'> | undefined> {
  const projects = await getProjects();
  return projects.find((project) => project.id === slug);
}

export async function getFlatRoutePosts(): Promise<
  Array<CollectionEntry<'writing'> | CollectionEntry<'legacy'>>
> {
  const [writing, legacy] = await Promise.all([getPublishedWriting(), getLegacyPosts()]);
  return [...writing, ...legacy].sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
}
