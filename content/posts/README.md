# 博客写作指南

这里统一记录博客文章格式、可复用文章块和交互能力。新增写作组件时，应同步更新这份文档，不再依靠旧文章反查写法。

`README.md` 位于 `content/posts` 根目录，不会被当作博客文章发布。中文文章放在 `chinese`，英文文章放在 `english`。

## 新建文章

文章使用 Markdown，文件开头需要包含 Front Matter：

```yaml
---
title: "文章标题"
slug: "stable-post-slug-cn"
aliases: ["old-or-shared-slug"]
date: "2026-07-21"
updated: "2026-07-21"
summary: "用于博客列表、搜索和 SEO 的简短摘要。"
tags: ["Travel", "Food"]
category: "Experience"
image: "https://img.markxu.icu/example.jpg"
---
```

- `title`、`date` 和 `summary` 必填。
- `slug` 建议显式填写，并在发布后保持稳定。
- `aliases` 用于兼容旧地址或中英文文章共用地址。
- `updated` 仅在文章有实质更新时填写。
- `category` 当前常用值为 `Experience`、`tech`、`essay`、`share` 和 `project`。
- `image` 是列表卡片和分享信息使用的封面图。

## 普通图片

优先使用标准 Markdown 图片语法：

```md
![图片说明](https://img.markxu.icu/example.jpg)
```

图片会自动获得以下能力：

- 使用 `alt` 文本生成图片说明。
- 点击后进入灯箱查看原图。
- 根据运行环境改写为合适的图片地址。

`alt` 不要留空，它同时服务图片说明、无障碍访问和灯箱内容。

## 文字环绕图片

`FloatImage` 适合把单张图片插在正文左侧或右侧，让后续文字像 Word 文档一样沿图片另一侧排版。图片仍然支持点击灯箱；在手机等窄屏上会自动恢复为整行显示。

```html
<FloatImage
  src="https://img.markxu.icu/example.jpg"
  alt="图片内容说明"
  side="left"
  width="40%"
/>
```

支持的属性：

- `src`：必填，图片地址。
- `alt`：建议填写，用于无障碍访问和灯箱说明；未指定 `caption` 时也会显示为图注。
- `side`：`left` 或 `right`，省略或填写无效值时默认为 `right`。
- `width`：可填写 `small`、`medium`、`large`，分别对应 32%、40%、48%；也可直接填写 30% 到 50% 的百分比，超出范围时会自动限制。省略时为 40%。
- `caption`：可选，用于覆盖默认图注。写成 `caption=""` 可以只保留 `alt` 而不显示图注。

标签后紧接的普通段落会环绕图片；遇到标题、代码块、引用、表格或其他图片布局时会自动结束环绕，不会跨越到下一个章节。左右连续插图时，建议在两张图之间保留足够的正文。

## 旁白便利贴

`AsideNote` 用于放置背景知识、概念解释或不打断正文叙事的旁白。内容使用与正文相同的字号和仿宋字体，并以顶部贴有半透明胶带的彩色便利贴呈现。

```md
<AsideNote color="blue" width="medium">

武汉的近代城市格局与长江、汉江的交汇关系密切。**汉口、汉阳、武昌**原本各自发展，后来共同构成今天的武汉三镇。

- 可以继续使用 Markdown 列表。
- 也可以加入[资料链接](https://example.com/)。

</AsideNote>
```

支持的属性：

- `color`：`yellow`、`orange` 或 `blue`，分别对应浅黄色、亮橙色和浅蓝色；省略时默认为 `yellow`。
- `width`：`small`、`medium`、`large` 或 `full`，分别占正文宽度的 56%、72%、86% 和 100%；省略时默认为 `full`。

开始标签之后和结束标签之前都要保留一个空行，这样内部段落、粗体、链接和列表才能继续按 Markdown 解析。组件在手机上会自动使用全宽，不会把仿宋正文压成过窄的文字列；它也会主动结束前一张环绕图片的浮动。

## 双列图片网格

适合并排比较两张图片。移动端自动退回单列，多于两张时会继续按两列换行。

```html
<div class="img-grid-2">
  <img src="https://img.markxu.icu/image-one.jpg" alt="第一张图片说明" />
  <img src="https://img.markxu.icu/image-two.jpg" alt="第二张图片说明" />
</div>
```

在 HTML 块前后各留一个空行，避免 Markdown 将它与相邻段落合并。

## 横版滚动相册

适合游记、探店和连续场景照片。手机可以触摸滑动，桌面端可以鼠标拖动；按住 `Ctrl` 滚动滚轮也可以横向浏览。拖动后不会误触灯箱，正常点击图片仍会打开原图。

```html
<div class="photo-scroll">
  <img src="https://img.markxu.icu/shop.jpg" alt="店铺门面" />
  <img src="https://img.markxu.icu/inside.jpg" alt="店内环境" />
  <img src="https://img.markxu.icu/food.jpg" alt="餐点" />
</div>
```

这一布局使用 `4:3` 横版取景框，建议放入三张或更多图片。

## 竖版滚动相册

适合菜单、海报、书籍、人物和手机截图。它仍然是横向滚动，只是每个图片卡位使用 `3:4` 竖版比例。

```html
<div class="photo-scroll-vertical">
  <img src="https://img.markxu.icu/menu-one.jpg" alt="菜单第一页" />
  <img src="https://img.markxu.icu/menu-two.jpg" alt="菜单第二页" />
  <img src="https://img.markxu.icu/menu-three.jpg" alt="菜单第三页" />
</div>
```

不要把横版和竖版图片混在同一个滚动相册中，否则 `object-fit: cover` 会裁掉较多内容。

## 网站链接卡片

`WebsiteCard` 用于在文章中介绍一个网站、个人主页或项目地址。它会显示网站截图、域名、标题和说明，并在新标签页打开链接。

```html
<WebsiteCard
  url="https://example.com/"
  title="Example"
  description="对这个网站或链接的简短说明。"
/>
```

只支持以下属性：

- `url`：必填，只接受 `http` 或 `https` 地址。
- `title`：必填，卡片主标题。
- `description`：可选，建议控制在一到两句话。

不要在属性中插入 Markdown。所有内容都会作为普通文本安全渲染。

## 参考资料面板

适合技术文章、论文笔记和资料汇总。每个链接可以用 `data-note` 补充它与正文的关系。

```html
<ArticleReferences
  title="参考与延伸阅读"
  description="这里列出本文使用的公开资料和进一步阅读线索。"
>
  <a href="https://example.com/paper" data-note="文章采用的主要定义和背景资料。"
    >资料名称</a
  >
  <a href="https://example.com/code" data-note="相关实现与实验代码。"
    >项目代码</a
  >
</ArticleReferences>
```

也可以使用更简短的写法，让标题和说明使用默认值：

```html
<article-references>
  <a href="https://example.com/" data-note="可选说明">资料名称</a>
</article-references>
```

支持的面板属性为 `title`、`description` 和 `eyebrow`；链接说明通过 `data-note` 提供。

## 旅行路线地图

`PhotoRoute` 用于在游记中展示由照片定位生成的交互路线。路线 JSON 放在
`content/travel/routes`，文章只引用不带扩展名的稳定文件名：

```html
<PhotoRoute
  route="wuhan1"
  title="武汉的一天"
  desc="从照片定位整理的武汉探店路线与停留点。"
/>
```

支持的属性：

- `route`：必填，对应 `content/travel/routes/<route>.json`。
- `title`：可选，覆盖 JSON 内的路线标题。
- `desc`：可选，显示在标题和路线统计之间。

预渲染时会从 JSON 生成日期、距离、路径点和 Stop 数量；路线接近视口时才会加载
MapLibre 和地图样式。普通文章不会加载地图代码。
`pnpm --dir apps/web dev` 和 `pnpm --dir apps/web build` 会自动刷新轻量路线摘要；
只需要单独刷新时可运行 `pnpm --dir apps/web generate:photo-routes`。
地图支持拖动和触摸缩放；普通滚轮继续滚动文章，`Command + 滚轮` 才缩放地图。
点击 Stop 会原地打开详情卡，不会重新居中地图。

路线 JSON 会公开精确坐标。提交前必须检查住宅、酒店、工作地点等不希望公开的位置。
大体积视频和图片仍放图床，路线 JSON 保留在 Git 中，方便跟随文章审查和回滚。

## 代码块

使用带语言名称的 Markdown 围栏代码块：

````md
```ts
export function greet(name: string) {
  return `Hello, ${name}`;
}
```
````

文章页会自动加入语法高亮、复制、换行、横向滚动和展开收起功能。语言名称应尽量准确，例如 `ts`、`tsx`、`js`、`css`、`bash`、`json`。

## 数学公式

行内公式使用一对美元符号：

```md
慢启动阶段可以记作 $cwnd \leftarrow cwnd + MSS$。
```

独立公式使用两对美元符号：

```md
$$
cwnd_{next} = cwnd + \min(N, SMSS)
$$
```

只有包含公式的文章才会加载 KaTeX 样式。

## 表格列宽

普通 Markdown 表格会自动获得横向滚动容器。需要控制列宽时，在表格正上方添加 `table-widths` 注释：

```md
<!-- table-widths: 24%, 38%, 38% -->

| 类型 | 适用场景 | 说明               |
| ---- | -------- | ------------------ |
| 网格 | 两图比较 | 桌面双列，移动单列 |
| 滚动 | 连续照片 | 支持拖动和灯箱     |
```

列宽支持百分比和常见 CSS 长度表达式。列数应与表格实际列数一致。

## 新增写作组件

先判断新能力属于哪一类，再放入唯一对应的位置：

| 类型           | 示例                                   | 实现位置                                          |
| -------------- | -------------------------------------- | ------------------------------------------------- |
| 纯样式文章块   | 图片网格、提示框                       | `apps/web/src/assets/styles/article-blocks.css` |
| DOM 交互增强   | 拖动相册、图片灯箱                     | `apps/web/src/hooks/useArticleXxx.ts`           |
| 结构化 Embed   | `WebsiteCard`、`ArticleReferences` | `apps/web/src/lib/article/embeds`               |
| React 页面组件 | About 页面使用的卡片                   | `apps/web/src/components/article`               |
| 共享数据与校验 | URL、属性和展示模型                    | `apps/web/src/lib/article`                      |

新增文章块时遵守以下约定：

1. 新 class 优先使用 `article-` 前缀，避免与第三方 Markdown 样式冲突。
2. 如果需要 JavaScript 交互，建立名称明确的 `useArticleXxx` Hook，不把行为写进页面组件。
3. 如果需要读取作者提供的属性，使用 Article Embed 注册机制，不通过字符串拼接生成 HTML。
4. 如果还需要在普通页面中调用，再提供独立的 React 组件，并让两个版本共享 `lib/article` 中的模型。
5. 同步补充本 README 的复制示例、属性说明、移动端行为和无障碍要求。
6. 已经发布到文章中的 class 和属性视为内容 API，修改名称时必须兼容旧文章。
