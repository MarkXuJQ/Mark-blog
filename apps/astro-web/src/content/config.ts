import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
	// Use the glob loader to find Markdown files in the external directory
	loader: glob({ pattern: '**/[^_]*.md', base: "../../content/posts" }),
	schema: z.object({
		title: z.string(),
		date: z.string(),
		updated: z.string().optional(),
		summary: z.string().optional(),
		tags: z.array(z.string()).default([]),
		category: z.string().optional(),
	}),
});

const timeline = defineCollection({
	loader: glob({ pattern: '*.json', base: "../../content/timeline" }),
	schema: z.array(z.object({
		date: z.string(),
		title: z.string(),
		description: z.string().optional(),
		categories: z.array(z.object({
			title: z.string(),
			items: z.array(z.object({
				id: z.string(),
				content: z.string(),
				date: z.string().optional(),
			})),
		})),
	})),
});

export const collections = { posts, timeline };
