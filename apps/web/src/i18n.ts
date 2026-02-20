export type Lang = 'zh' | 'en'

export const messages = {
  zh: {
    siteTitle: 'Mark 的小屋',
    nav: {
      blog: '文章',
      life: '生活随笔',
      movies: '影视',
      games: '游戏',
      links: '链接',
    },
    home: {
      title: '欢迎来到 Mark 的小屋',
      intro:
        '这里是我的个人网站，用来记录技术思考、生活随笔和一些有趣的作品。',
      description:
        '未来这里会有：技术文章、生活照片和碎碎念，以及我看过的影视与玩过的游戏清单。',
    },
    readingTimeLabel: (minutes: number) => `预计阅读时间：${minutes} 分钟`,
    githubLabel: '我的 GitHub',
  },
  en: {
    siteTitle: "Mark's Blog & Portfolio",
    nav: {
      blog: 'Blog',
      life: 'Life',
      movies: 'Movies',
      games: 'Games',
      links: 'Links',
    },
    home: {
      title: "Welcome to Mark's Cabin",
      intro:
        "This is my personal space for technical thoughts, daily notes, and side projects.",
      description:
        "In the future you'll find: blog posts, life snippets, photos, and lists of movies & games I've enjoyed.",
    },
    readingTimeLabel: (minutes: number) => `Estimated reading time: ${minutes} min`,
    githubLabel: 'My GitHub',
  },
} as const

