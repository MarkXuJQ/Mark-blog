/**
 * Shared Tailwind className fragments reused across components.
 *
 * Keeping these single-sourced avoids drift between visually-identical
 * widgets (e.g. the blog sidebar card) and makes global visual tweaks a
 * one-line change.
 */

/**
 * Standard padded "paper" card used by blog sidebar widgets. Short labels,
 * titles, counts and buttons inside use the site's rounded display face.
 */
export const widgetCardClass =
  'font-round border border-slate-200/70 p-6 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] transition-all hover:shadow-[0_24px_56px_-34px_rgba(15,23,42,0.5)] dark:border-0 dark:shadow-none'