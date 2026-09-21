import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const publishedArticle = z.object({
  title: z.string(),
  pubDate: z.coerce.date(),
  category: z.string().optional(),
  image: z.string().optional(),
  description: z.string().optional(),
  featured: z.boolean().optional(),
  homeOrder: z.number().int().positive().optional(),
  draft: z.boolean().default(false),
});

const link = z.object({
  label: z.string(),
  href: z.url(),
});

const collaborator = z.object({
  name: z.string(),
  href: z.url().optional(),
});

const media = z.object({
  kind: z.enum(['image', 'video', 'youtube']),
  src: z.string(),
  poster: z.string().optional(),
  alt: z.string(),
  caption: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const highlight = z.object({
  value: z.string(),
  label: z.string(),
});

const writing = defineCollection({
  loader: glob({ base: './src/content/writing', pattern: '**/[^_]*.{md,mdx}' }),
  schema: publishedArticle,
});

const legacy = defineCollection({
  loader: glob({ base: './src/content/legacy', pattern: '**/[^_]*.{md,mdx}' }),
  schema: publishedArticle,
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/[^_]*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    cardCaption: z.string(),
    summary: z.string(),
    projectType: z.string(),
    order: z.number().int().positive(),
    homeOrder: z.number().int().positive().optional(),
    displayDate: z.string(),
    cover: z.string(),
    coverAlt: z.string(),
    cardImage: z.string().optional(),
    cardImageAlt: z.string().optional(),
    accent: z.string(),
    highlights: z.array(highlight).min(2).max(3),
    collaborators: z.array(collaborator).default([]),
    links: z.array(link).min(1),
    media: z.array(media).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { writing, legacy, projects };
