import type { BlogPost } from '../types'

export const posts: BlogPost[] = [
  {
    id: '1',
    title: 'Hello World',
    slug: 'hello-world',
    date: '2024-02-24',
    summary: 'This is my first blog post.',
    content: '<p>Welcome to my blog! This is the first post.</p>',
    tags: ['general'],
  },
  {
    id: '2',
    title: 'Learning React',
    slug: 'learning-react',
    date: '2024-02-25',
    summary: 'React is a JavaScript library for building user interfaces.',
    content:
      '<p>React makes it painless to create interactive UIs. Design simple views for each state in your application, and React will efficiently update and render just the right components when your data changes.</p>',
    tags: ['tech', 'react'],
  },
]
