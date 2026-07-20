# Article widgets

Article widgets are custom elements embedded in Markdown and converted to
static HTML before an article is rendered. They do not add a client-side
component runtime or create a separate hydration boundary.

## WebsiteCard

```md
<WebsiteCard
  url="https://example.com/"
  title="Example"
  description="A short description of the website."
/>
```

`WebsiteCard` accepts only `url`, `title`, and `description`. The URL must use
HTTP or HTTPS. The rendered card opens in a new tab and loads its screenshot
lazily.

## ArticleReferences

```html
<ArticleReferences title="References" description="Further reading">
  <a href="https://example.com/paper" data-note="Optional note">Paper title</a>
</ArticleReferences>
```

## Adding a widget

1. Add an `ArticleWidgetDefinition` in this directory.
2. Parse and validate attributes in its `render` function.
3. Build output with DOM methods and `textContent`; do not concatenate raw
   article attributes into HTML.
4. Register the definition in `registry.ts`.
5. Add its shared styles to `global.css` and document the Markdown syntax here.

The complete article pipeline lives in `decorateArticleContent.ts`. It applies
image URL rewriting, registered widgets, and internal-link previews in that
order. Blog posts and movie reviews use the same pipeline.
