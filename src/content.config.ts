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
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
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
    summary: z.string(),
    order: z.number().int().positive(),
    displayDate: z.string(),
    projectDate: z.coerce.date().optional(),
    status: z.enum(['live', 'in-progress', 'prototype', 'completed']),
    cover: z.string(),
    accent: z.string(),
    collaborators: z.array(collaborator).default([]),
    links: z.array(link).min(1),
    media: z.array(media).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { writing, legacy, projects };
