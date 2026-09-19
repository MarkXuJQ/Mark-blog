# Movie Reviews

Put your movie review markdown files in this directory.

Every valid review is also indexed in the main Blog under the existing
`Experience` category (shown as `生活` in Chinese). The review file stays in
this directory, and Blog list entries open the shared
`/movies/reviews/<slug>` detail page. Legacy `/blog/<slug>` review links
redirect there as well.

Suggested frontmatter:

```md
---
title: "The Coroner's Squad: Calmness and Obsession"
date: "2026-03-26"
summary: "A grounded crime drama with strong emotional aftertaste."
movieSubjectId: "35208463"
movieTitle: "The Coroner's Squad"
rating: 5
image: "https://img.markxu.icu/movie-cover.jpg"
imageOverlay: true
background: "https://img.markxu.icu/movie-background.jpg"
tags: ["Movies", "Review"]
---
```

`imageOverlay` is optional. Set it to `true` for bright cover images so the
review title remains legible.

`background` is also optional. It accepts a complete image URL and renders it
behind the review page and floating navigation. Omit it for the normal plain
page background.

Then map this review in `content/movies/movie-overrides.json`:

```json
{
  "35208463": {
    "reviewSlug": "the-coroners-squad-calmness-and-obsession"
  }
}
```

The filename (without `.md`) is the `reviewSlug`.
