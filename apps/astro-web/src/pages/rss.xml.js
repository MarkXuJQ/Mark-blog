import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('posts');
  return rss({
    title: "Mark's Backyard",
    description: "A place for thoughts, code, and life.",
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: new Date(post.data.date),
      description: post.data.summary,
      link: `/blog/${post.id}/`,
    })),
    customData: `<language>zh-cn</language>`,
  });
}
