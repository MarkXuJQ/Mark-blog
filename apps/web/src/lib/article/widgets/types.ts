export interface ArticleWidgetContext {
  language?: string
}

export interface ArticleWidgetRenderArgs {
  document: Document
  source: Element
  context: ArticleWidgetContext
}

export interface ArticleWidgetDefinition {
  name: string
  selector: string
  render: (args: ArticleWidgetRenderArgs) => Node | null
}
