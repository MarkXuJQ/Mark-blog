export interface ArticleEmbedContext {
  language?: string
}

export interface ArticleEmbedRenderArgs {
  document: Document
  source: Element
  context: ArticleEmbedContext
}

export interface ArticleEmbedDefinition {
  name: string
  selector: string
  render: (args: ArticleEmbedRenderArgs) => Node | null
}
