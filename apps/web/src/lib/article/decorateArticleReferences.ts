function getAttribute(element: Element, name: string, fallback = '') {
  return element.getAttribute(name)?.trim() || fallback
}

function buildTextElement(
  document: Document,
  tagName: string,
  className: string,
  text: string
) {
  const element = document.createElement(tagName)
  element.className = className
  element.textContent = text
  return element
}

function createReferencePanel(
  document: Document,
  source: Element,
  language?: string
) {
  const isZh = language?.toLowerCase().startsWith('zh')
  const eyebrow = getAttribute(source, 'eyebrow', 'References')
  const title = getAttribute(
    source,
    'title',
    isZh ? '参考与延伸阅读' : 'References'
  )
  const description = getAttribute(
    source,
    'description',
    isZh
      ? '这里列出写作时用到的公开资料和论文线索，作为背景补充。'
      : 'Public sources and further reading used as background context.'
  )

  const section = document.createElement('section')
  section.className = 'article-reference-panel not-prose'
  section.setAttribute('data-article-widget', 'references')
  section.setAttribute('aria-label', title)

  const header = document.createElement('div')
  header.className = 'article-reference-panel__header'
  header.append(
    buildTextElement(
      document,
      'p',
      'article-reference-panel__eyebrow',
      eyebrow
    ),
    buildTextElement(document, 'p', 'article-reference-panel__title', title),
    buildTextElement(
      document,
      'p',
      'article-reference-panel__description',
      description
    )
  )

  const list = document.createElement('ul')
  list.className = 'article-reference-panel__list'

  const links = Array.from(source.querySelectorAll(':scope > a[href]'))

  links.forEach((sourceLink) => {
    const href = getAttribute(sourceLink, 'href')
    if (!href) return

    const item = document.createElement('li')
    item.className = 'article-reference-panel__item'

    const link = document.createElement('a')
    link.className = 'article-reference-panel__link'
    link.href = href
    link.target = '_blank'
    link.rel = 'noopener noreferrer'

    const body = document.createElement('span')
    body.append(
      buildTextElement(
        document,
        'span',
        'article-reference-panel__name',
        sourceLink.textContent?.trim() || href
      )
    )

    const note = getAttribute(sourceLink, 'data-note')
    if (note) {
      body.append(
        buildTextElement(
          document,
          'span',
          'article-reference-panel__note',
          note
        )
      )
    }

    const arrow = buildTextElement(
      document,
      'span',
      'article-reference-panel__arrow',
      '↗'
    )
    arrow.setAttribute('aria-hidden', 'true')

    link.append(body, arrow)
    item.append(link)
    list.append(item)
  })

  section.append(header, list)
  return section
}

export function decorateArticleReferences(html: string, language?: string) {
  const parser = new DOMParser()
  const document = parser.parseFromString(html, 'text/html')
  const referenceBlocks = Array.from(
    document.querySelectorAll('article-references, [data-article-references]')
  )

  referenceBlocks.forEach((block) => {
    const panel = createReferencePanel(document, block, language)
    block.replaceWith(panel)
  })

  return document.body.innerHTML
}
