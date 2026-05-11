declare module 'markdown-it-texmath' {
  import type MarkdownIt from 'markdown-it'
  import type katex from 'katex'

  type TexmathOptions = {
    engine: typeof katex
    delimiters?:
      | 'dollars'
      | 'brackets'
      | 'doxygen'
      | 'gitlab'
      | 'julia'
      | 'kramdown'
      | 'beg_end'
      | string[]
    katexOptions?: katex.KatexOptions
  }

  export default function markdownItTexmath(
    md: MarkdownIt,
    options: TexmathOptions
  ): void
}
