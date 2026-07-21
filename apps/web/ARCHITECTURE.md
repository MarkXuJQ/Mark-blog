# Frontend architecture

The source tree is organized by code type. Domain names appear in filenames or
one level below the type directory, so each file has one predictable place.

```text
src/
├── app/          Application infrastructure: analytics, providers, routing, SEO
├── assets/       Bundled fonts, images, SVGs, and global styles
├── components/   All reusable React UI, grouped by domain or shared UI role
├── data/         Generated browser data consumed by the application
├── hooks/        All React hooks, kept flat and named with domain context
├── languages/    Runtime translation resources
├── layouts/      Route shells and outlet composition
├── lib/          Non-React data, parsing, loaders, event buses, and utilities
├── pages/        Route entry components
└── vite-env.d.ts Vite environment and imported-content declarations
```

## Placement rules

- Put every reusable renderable React component in `components`. Use one domain
  directory such as `components/article` or `components/home`; reserve
  `components/ui` for domain-neutral primitives.
- Put every React hook in `hooks`. Keep the directory flat while it remains
  readable, and encode ownership in names such as `useArticleToc` and
  `useHomeRadarScene`.
- Put non-React behavior in `lib`: content loading, HTML transformation, data
  models, browser service loaders, event buses, and small shared utilities.
  Use a single domain level when several related files exist.
- Put startup behavior, global providers, routing infrastructure, analytics,
  and document metadata in `app`. These modules configure the application
  rather than render reusable page content.
- Keep route composition in `pages` and `layouts`. Extract reusable UI or
  behavior instead of growing a second component or utility system there.
- Prefer direct imports from descriptive files. Add a barrel only when it is a
  deliberate, stable public boundary rather than a shortcut around file names.

## Type ownership

- Keep component props and hook-specific types in the file that owns them.
- Export shared data types from the responsible `lib` module. For example,
  `BlogPost` is owned by `lib/content/posts.ts`, while Markdown import types are
  owned by `lib/content/markdown.ts`.
- Keep narrowly shared protocol types beside their implementation, such as
  `lib/article/embeds/types.ts`.
- Do not recreate a general `src/types` directory. A type without a clear owner
  usually indicates that the domain boundary or filename needs clarification.
- Keep `src/vite-env.d.ts` for browser build declarations and project-root
  `types/*.d.ts` for declarations used by Node-side configuration.

## Project-root directories

- `api/` contains Vercel serverless entry points and must remain outside the
  browser bundle.
- `server/` contains Node-only logic shared by API handlers and build scripts.
- `public/` is Vite's copy-as-is static asset root.
- `scripts/` contains build-time generators and prerender tooling.
- `types/` contains third-party declarations used by the Node-side Vite
  configuration.
- Configuration files and `index.html` stay at the project root because the
  corresponding tools discover them there.

## Dependency direction

```text
main / App
    ↓
app / pages / layouts
    ↓
components / hooks
    ↓
lib
```

- Components may use other components, hooks, and `lib` modules.
- Hooks may use other hooks and `lib` modules.
- `lib` must not import React components, hooks, pages, or layouts.
- Domain components may compose shared `components/ui` primitives.

## Article embeds

Markdown keywords such as `WebsiteCard` are article embeds, not React UI. Their
attribute validation and static HTML renderers live in `lib/article/embeds`.
The interactive React versions live in `components/article`, while shared URL
normalization lives in `lib/article/websiteCardModel.ts` so both renderers use
the same behavior.
