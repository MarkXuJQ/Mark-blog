# Movie Reviews

Put your movie review markdown files in this directory.

Every valid review is also indexed in the main Blog under the existing
`Experience` category (shown as `生活` in Chinese). The review file stays in
this directory, and the original `/movies/reviews/<slug>` route remains
available alongside the `/blog/<slug>` entry.

Suggested frontmatter:

```md
---
title: "The Coroner's Squad: Calmness and Obsession"
date: "2026-03-26"
summary: "A grounded crime drama with strong emotional aftertaste."
movieSubjectId: "35208463"
movieTitle: "The Coroner's Squad"
rating: 5
tags: ["Movies", "Review"]
---
```

Then map this review in `content/movies/movie-overrides.json`:

```json
{
  "35208463": {
    "reviewSlug": "the-coroners-squad-calmness-and-obsession"
  }
}
```

The filename (without `.md`) is the `reviewSlug`.
