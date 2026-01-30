# 个人博客网站项目纲领（规划版）

## 目标

- 构建一个可长期维护的个人技术博客与作品集网站（Personal Website & Portfolio）
- 通过该项目系统掌握前端（React/TypeScript/现代工程化）与后端（Node/数据库/部署）
- 支持文章发布、项目展示（作品集）、关于我、标签分类、全文搜索、评论（可选）、RSS、站点统计
- 优先使用 GitHub Pages 进行前端静态托管；后端采用独立服务（如 Supabase/Render/Cloudflare Workers）以便学习与实践

## 技术选型

- 前端：React + TypeScript + Vite + React Router
- 状态与数据：React Query（服务端数据缓存）+ 轻量全局状态（Zustand 或 Context）
- UI 与样式：Tailwind CSS（优先）或 CSS Modules（根据个人偏好选择其一）
- 内容管理：MDX（本地）起步，后续可迁移到 Headless CMS（如 Contentful/Sanity）或自建后台
- 测试：Vitest + React Testing Library
- 代码质量：ESLint + Prettier + TypeScript 严格模式
- 后端：Node.js + Express/Fastify，ORM 选 Prisma；数据库起步 SQLite，本地开发简单；生产建议 PostgreSQL（Supabase）
- 部署与托管：前端 GitHub Pages；后端 Render/Supabase/Cloudflare（任选其一）

## 项目结构（计划）

```
Mark-blog/
  ├─ apps/
  │   ├─ web/                # 前端单页应用（Vite）
  │   └─ api/                # 后端服务（可独立部署）
  ├─ packages/
  │   ├─ ui/                 # 共享 UI 组件库（可选）
  │   └─ utils/              # 共享工具函数与类型
  ├─ docs/                   # 技术文档与设计草案
  ├─ .github/                # GitHub Actions 工作流
  ├─ PLAN.md                 # 项目纲领（当前文件）
  └─ README.md               # 对外介绍与使用说明（后续补充）
```

## 核心功能里程碑

- M0 基础设施
  - 初始化仓库、工程化（Lint、TS、Prettier、CI）
  - 前端脚手架搭建（Vite/React/TS）
  - 设计基础 UI 系统与主题（暗/明）
- M1 内容系统
  - 文章显示：列表页面、详情页面（支持 MDX）
  - 标签与分类；面包屑与导航
  - 基础 SEO：Meta、Open Graph、Sitemap、RSS
- M1.5 作品集系统
  - 项目展示页：项目卡片、筛选（技术栈/类型）
  - 项目详情页：图文介绍、演示链接、GitHub 链接
  - “关于我”页面：简历、技能栈可视化
- M2 增强功能
  - 全文搜索（本地索引：Lunr.js/elasticlunr）
  - 评论系统（第三方：Giscus/Utterances 或自建）
  - 图片与资源优化（懒加载、压缩）
- M3 后端与数据
  - 后端服务（Node + Prisma）
  - 用户系统（登录、草稿、发布权限）
  - 数据持久化（PostgreSQL/Supabase），提供简易管理后台
- M4 部署与运维
  - GitHub Pages 前端部署
  - 后端独立部署（Render/Supabase/Cloudflare）
  - GitHub Actions 自动化 CI/CD 与预览环境

## 部署策略（前后端分离）

- 前端 SPA 放在 GitHub Pages（免费、可靠）
- 后端独立域名或子域（如 api.example.com），通过 CORS/代理与前端通信
- 若仅需静态内容（纯博客），可暂不启用后端；先用 MDX + 本地构建

## 开发流程与约定

- 分支策略：main（稳定） + feature/_（功能） + fix/_（修复）
- 提交规范：约定式提交（feat/fix/chore/docs/test/build）
- 代码审查：PR + CI（Lint、Typecheck、Test）
- 版本管理：语义化版本（后续如发布 npm 包时启用）

## 学习路径建议

- 先完成基础设施（Vite/React/TS/Tailwind/ESLint/Prettier）
- 以 MDX 驱动内容，搭出“文章列表/详情/标签”闭环
- 引入 React Query 与路由，理解数据流与缓存
- 接入 Supabase/PostgreSQL 与 Prisma，理解后端与数据库模型
- 打通 CI/CD 与 GitHub Pages/后端托管的完整发布流程

## 后续扩展

- 主题系统与插件机制（如代码高亮、数学公式、图表）
- 站点分析与统计（Plausible/Umami）
- 国际化（i18n）
- 性能优化（代码分割、资源预取、PWA）

---

本纲领旨在保证方向清晰、可逐步迭代。在后续实现中，我们会严格按照里程碑推进，并保持工程实践与学习目标相统一。
