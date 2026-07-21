# Article embeds

Article embeds are custom elements embedded in Markdown and converted to static
HTML before an article is rendered. They do not add a client-side component
runtime or create a separate hydration boundary.

The author-facing syntax and copy-ready examples live in
`content/posts/README.md`. Keep that guide as the single source of truth for
writing posts.

## Adding an embed

1. Add an `ArticleEmbedDefinition` in this directory.
2. Parse and validate attributes in its `render` function.
3. Build output with DOM methods and `textContent`; do not concatenate raw
   article attributes into HTML.
4. Register the definition in `registry.ts`.
5. Add author-facing styles to `assets/styles/article-blocks.css`.
6. Document the supported attributes and a copy-ready example in
   `content/posts/README.md`.

The complete article pipeline lives in `decorateArticleContent.ts`. It applies
image URL rewriting, registered embeds, and internal-link previews in that
order. Blog posts and movie reviews use the same pipeline.
