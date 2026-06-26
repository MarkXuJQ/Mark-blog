# Mark Blog Design System

这份规范用于后续调整页面、卡片、筛选器、提示框和丰富/简洁模式时保持视觉一致。新增 UI 时优先复用这里的模式；如果必须偏离，先确认偏离是为了表达某个独立内容气质，而不是临时配色。

## 设计方向

- 整体气质：克制、清爽、偏编辑型内容站，不使用过亮的提示蓝作为大面积容器色。
- 视觉层级：页面背景最轻，卡片承担主要内容承载，按钮和标签只做轻量强调。
- 颜色原则：容器用 slate + white / charcoal；品牌色只用于少量 icon、链接 hover、当前分类等语义强调。
- 模式原则：丰富模式可以有卡片、阴影、图标、动画；简洁模式尽量保留文本结构，不额外添加筛选、装饰性卡片或复杂交互。

## 基础 Token

### 卡片容器

默认卡片以 `Card` 组件为准：

```tsx
'rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] backdrop-blur transition-colors duration-300 sm:p-6 dark:border-0 dark:bg-[#17191c] dark:shadow-none'
```

紧凑卡片或提示框可以缩小圆角和 padding，但不要改变色系：

```tsx
'rounded-xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] backdrop-blur dark:border-0 dark:bg-[#17191c] dark:shadow-none'
```

### 深色模式

- 容器背景：`dark:bg-[#17191c]`
- 容器边框：大多数卡片使用 `dark:border-0`
- 容器阴影：使用 `dark:shadow-none`
- 输入、下拉框、轻量控制也可使用 `dark:border-[#2b2f36] dark:bg-[#17191c]`
- 不要在提示框里使用亮蓝、亮青、亮紫这类高饱和底色，除非是错误、成功等强语义状态。

### 文本

- 主标题：`text-slate-900 dark:text-slate-100`
- 正文/描述：`text-slate-500 dark:text-slate-400`
- 弱信息：`text-slate-400 dark:text-slate-500`
- 简洁模式优先使用 CSS 变量：`text-[var(--text-primary)]`、`text-[var(--text-secondary)]`

### 品牌色

品牌色只用于小面积强调：

```tsx
'text-[var(--brand-500)]'
'hover:text-[color-mix(in_srgb,var(--brand-600)_82%,var(--text-primary)_18%)]'
'dark:hover:text-[color-mix(in_srgb,var(--brand-400)_82%,var(--text-primary)_18%)]'
```

适合使用品牌色的地方：

- 页面头部 icon
- 链接 hover
- 当前分类的 icon / 文本
- 小型下划线或分隔装饰

不适合使用品牌色的地方：

- 大面积提示框背景
- 普通卡片背景
- 标签筛选后的容器背景
- 非语义性的 hover 阴影

## 组件模式

### 标准卡片

适用于文章卡片、友链卡片、统计卡片、内容面板。

```tsx
const cardClass = cn(
  'rounded-2xl border border-slate-200/70 bg-white/80 p-4',
  'shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] backdrop-blur',
  'transition-colors duration-300 sm:p-6',
  'dark:border-0 dark:bg-[#17191c] dark:shadow-none'
)
```

可选 hover：

```tsx
'transition-[background-color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_16px_34px_rgba(15,23,42,0.10)] dark:hover:bg-[#1d2025]'
```

### 提示框 / 空状态

提示框不要单独发明颜色，默认视为一种轻量卡片。

```tsx
const noticeClass = cn(
  'rounded-xl border border-slate-200/70 bg-white/80 px-4 py-5',
  'text-sm text-slate-500 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] backdrop-blur',
  'dark:border-0 dark:bg-[#17191c] dark:text-slate-400 dark:shadow-none'
)
```

适用位置：

- 归档筛选后的状态栏
- 友链申请规则
- 友链空状态
- 时间线人生记录占位
- 搜索无结果、列表空状态

### 标签 / Pill

普通标签使用中性色，不使用亮蓝底。

```tsx
const tagClass = cn(
  'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5',
  'text-xs font-medium text-slate-500 transition-[background-color,color,box-shadow]',
  'hover:bg-slate-200/70 hover:text-slate-900',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300',
  'dark:bg-slate-800 dark:text-slate-400',
  'dark:hover:bg-slate-700/70 dark:hover:text-slate-100'
)
```

选中或同标签 hover 高亮：

```tsx
const activeTagClass = cn(
  'bg-slate-200/70 text-slate-900 shadow-[0_0_0_1px_rgba(148,163,184,0.28)]',
  'dark:bg-slate-700/70 dark:text-slate-100 dark:shadow-[0_0_0_1px_rgba(100,116,139,0.35)]'
)
```

只有当标签代表分类，并且已经有分类专属图标/色彩映射时，才使用分类色。

### 下拉菜单

触发按钮保持稳定尺寸，不要因为菜单内容调整而变形。菜单内容根据布局收紧。

```tsx
const triggerClass = cn(
  'flex min-w-0 cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2',
  'text-[0.95rem] font-medium text-slate-700 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.3)]',
  'transition-[background-color,color,box-shadow] hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm',
  'dark:bg-[#17191c] dark:text-slate-300 dark:shadow-none',
  'dark:hover:bg-[#23262c] dark:hover:text-slate-100'
)
```

菜单面板：

```tsx
const menuClass = cn(
  'rounded-lg border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5',
  'dark:border-[#2b2f36] dark:bg-[#17191c] dark:ring-white/10'
)
```

分类筛选菜单在宽屏可用 `grid-cols-2`，窄屏保留单列；面板宽度应和文章列表右侧对齐，避免横向漂移。

## 丰富模式与简洁模式

### 丰富模式

可以使用：

- 卡片容器
- 图标
- 筛选器
- 统计数字
- hover 高亮
- 适度阴影和轻微位移
- Framer Motion 的轻量入场或布局动画

### 简洁模式

应该避免：

- 新增复杂筛选功能
- 大面积卡片装饰
- 非必要 icon
- 多余阴影
- 复杂 hover 状态

简洁模式优先用文本、分隔线和留白表达结构。

## 响应式规则

- 手机端优先保证可读性，不强行维持桌面栅格。
- 分类菜单：宽屏可以 `2 列 3 行`，窄屏回到 `1 列 6 行`，但宽度不应比桌面菜单更夸张。
- 卡片列表：使用 `repeat(auto-fit,minmax(min(100%,18rem),1fr))` 这类自适应网格。
- 横向滚动内容要支持触摸和鼠标拖拽，但不能牺牲链接点击。

## 交互状态

每个可点击元素至少覆盖：

- `hover`
- `focus-visible`
- `active` 或 pressed 状态，如果它是切换控件
- `aria-pressed` / `aria-selected`，如果它表达选中状态

交互反馈优先顺序：

1. 文本颜色变化
2. 背景从 `slate-100` 到 `slate-200/70`
3. 轻微 ring 或 shadow
4. 小幅位移，只用于卡片，不用于文本按钮

## 新增或调整 UI Checklist

1. 是否直接复用了 `Card` 或卡片 class 模板？
2. 浅色模式是否是 `bg-white/80` 附近，而不是新的彩色背景？
3. 深色模式是否统一到 `dark:bg-[#17191c]`？
4. 深色卡片是否取消了边框和阴影？
5. 标签、提示框、空状态是否避免亮蓝色大面积出现？
6. 品牌色是否只出现在小面积强调处？
7. 简洁模式是否没有被加入复杂功能？
8. 手机端是否保持一列或自然换行？
9. 可点击元素是否有 `focus-visible` 和正确的 aria 状态？
10. 修改后是否运行 `eslint` 和 `tsc`？

## 推荐校验命令

```bash
pnpm -C apps/web exec eslint <changed-files>
pnpm -C apps/web exec tsc -b --pretty false
```

如果调整了视觉布局，建议同时在浅色和深色模式各检查一次，并至少覆盖桌面宽度和手机宽度。
