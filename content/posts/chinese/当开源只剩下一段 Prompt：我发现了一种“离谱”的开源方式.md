---
title: "当开源只剩下一段 Prompt：我发现了一种“离谱”的开源方式"
slug: "prompt-only-open-source-cn"
aliases: ["prompt-only-open-source"]

date: "2026-04-05"

updated: "2026-04-06"

summary: "最近在 GitHub 上看到了一个项目：voice-input-src。一个为mac写的语音输入软件。震惊的是打开仓库你会发现只有一段写给AI的Prompt。"

tags: ["Github", "Swift", "MacOS", "AI", "Prompt"]

category: "tech"

image: "https://img.markxu.icu/imgvoiceinput.jpeg"
---
最近在 GitHub 上闲逛，看到了一个另我感到些许震撼又好笑的项目： **[voice-input-src](https://github.com/yetone/voice-input-src?tab=readme-ov-file)** 。一个为Mac而生的语音输入插件。打开代码仓库你会发现，里面根本没有我们传统认知中的 Swift 这类的具体代码，只有一段写给 AI（Claude）的，极其详细的包含中英文两种的一段 Prompt。

我开始好奇：**这种开源的方式真的有效嘛？这样开源用户做出来的东西真的能用吗？** 刚好我也有一个Macbook，便想着在我的 Mac 上尝试复现一下，验证下这个开源模式的可行性。

---

## 项目解构：这真的是“源码”吗？

### **1. 极简的仓库结构**

**README.md** ：项目说明里面包含了所需的**Prompt 文本，再无其他。**

![项目仓库](https://img.markxu.icu/imgvoiceInputRepo.png)

不得不说，这种开源方式真的很方便理解项目😂。

### **2. Prompt 即源码（哈哈哈）**

传统的开源是“人读代码，编译器执行”，而这个项目是“人读Prompt，AI 执行”。作者 yetone 甚至专门建立了一个 [voice-input-dist的repo](https://github.com/yetone/voice-input-dist) 来存放他利用ai最终构建出的 App源码，以方便将“源”与“产物”彻底分离（小巧思说是），也方便用户进行对比。

## Prompt 里藏了什么？

仔细看这个项目，我们能探索的只有这一端prompt，为了尝试后续的复现，我分析了下这段 Prompt 。这不是一个程序小白随手写出来的需求文档，告诉ai我需要什么样的软件，而是一个对 macOS 底层 API 有精准的调用要求的程序员所构建出来的文档：

| 模块                 | 实现细节                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------- |
| **语音识别**   | 使用 Apple Speech Recognition 框架，支持流式转录（边听边说），默认中文。                     |
| **全局热键**   | 监听 Fn 键（需全局事件监听 CGEvent tap），并**抑制默认行为** （防止弹出 emoji 面板）。 |
| **悬浮窗 UI**  | 无边框 NSPanel、视觉模糊效果、**实时波形动画** （基于音频 RMS 驱动，非假动画）。       |
| **输入法兼容** | 检测当前输入法，粘贴前自动切换至 ABC 键盘（防 Cmd+V 拦截），粘贴后恢复。                     |
| **LLM 后处理** | 调用 OpenAI 兼容 API 进行纠错（仅修正明显错误，如“配森”->“Python”）。                    |

从上面具体的专业术语可以看出作者在写这段 prompt 的时候，清晰的知道需要调用什么框架，有什么组件可以去使用，后续会遇到什么冲突问题，又应该如何去解决。因为作者足够了解相关的技术知识和实现难题，才可以这样精准的写出整个项目的完整 prompt。甚至有Github上issue的留言：

> 这玩意才是真正的 prompt 开发教程

## 我的复现 (On My Mac)

为了真的去验证下这种开源是否真的有效，也体验下这种有点逆天的prompt engineer，我在我的 Mac 上进行一次“从 Prompt 到 App”的完整实验。

### **1. 环境**

- **Mac** ：我的2021款的 M1 pro，系统是Tahoe 26.3.1
- **AI 工具** ：Codex，调用的是GPT 5.4 Extra High（想要试试与作者不一样的ai能否成功）。

下面是我的设备配置图：

![我的电脑配置](https://img.markxu.icu/imgComputerConfig.png)

### **2. 具体步骤**

1. **Prompt 投喂** ：将仓库中的完整 Prompt 发送给 Codex。
2. **功能验收测试** ：（才不是因为我不太会Swift才不去读源码）

功能检查：

✅ Fn 键是否能稳定录音且不弹 emoji？
✅ 悬浮窗波形是否随音量实时变化？
✅ 中文识别准确率如何？LLM 纠错是否生效？

![发给Codex的Prompt](https://img.markxu.icu/imgSendItToCodex.png)

**3.具体实现：**
其实在我这里并没有一次就生成成功，让程序可以正确的build出来，第一次完整的构建花了大概**23min**，花了 **$1.3994**（USD）,后面有两个小问题在运行的时候出现了报错， 于是我接着让codex进行了两次修复，加上修复一共花了 $1.9734（USD）。

下面是codex对于这两次修复内容的简单概括：

> 这两次修复，本质上分别解决了一个“编译期问题”和一个“运行期崩溃问题”。
>
> 第一处是 PasteboardInjector.swift (line 18) 的修复。那里原来写法里，pasteboard.pasteboardItems?.map { ... } ?? [] 这个表达式要靠 Swift 自己推断 items 的类型。在某些情况下，编译器会对这个可选链加空数组兜底的写法推断不稳定，最后在 return PasteboardBackup(items: items) 这一行报错。修复方式很简单，就是把 items 明确写成 [Item]。这样做没有改变任何业务逻辑，只是把“你自己猜类型”改成了“我明确告诉你类型”，让编译器稳定通过。
>
> 第二处是 FloatingPanelController.swift (line 93) 的修复。这里原来给 NSPanel 设置了 collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .moveToActiveSpace, .ignoresCycle]。问题在于，.canJoinAllSpaces 和 .moveToActiveSpace 这两个行为语义上是冲突的：一个强调“加入所有 Space”，另一个强调“跟随当前活跃 Space 移动”。AppKit 对这类窗口行为组合比较敏感，有时会直接触发断言，最终表现成 abort signal 崩溃。修复后我把它改成了更稳妥的组合：保留 .moveToActiveSpace、.fullScreenAuxiliary、.ignoresCycle，再加上 .transient，去掉 .canJoinAllSpaces。这样浮窗依然能在当前空间和全屏应用旁边正常显示，但不会再因为窗口行为冲突而在初始化时崩掉。

## 效果展示

其实你们应该能想到，这整篇文章就是我用这个软件进行转述的，效果还蛮不错的。而且出字很快，比苹果原装带有的语音输入要反馈更加及时，而且调用也方便些。
具体的效果正如现在：

![我的效果](https://img.markxu.icu/imgAppEffect.png)

说到其具体缺点，可以看到我们的字没有居中有些难受，后续通过codex进行提示也修复了。总体看下来也不如[作者使用claude做出来的效果](https://private-user-images.githubusercontent.com/1206493/570996776-3228f78a-f035-447d-98ef-8826798a122c.mp4?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzU0ODU4NTksIm5iZiI6MTc3NTQ4NTU1OSwicGF0aCI6Ii8xMjA2NDkzLzU3MDk5Njc3Ni0zMjI4Zjc4YS1mMDM1LTQ0N2QtOThlZi04ODI2Nzk4YTEyMmMubXA0P1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9QUtJQVZDT0RZTFNBNTNQUUs0WkElMkYyMDI2MDQwNiUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyNjA0MDZUMTQyNTU5WiZYLUFtei1FeHBpcmVzPTMwMCZYLUFtei1TaWduYXR1cmU9OWY5YTBiZjNmNDNlYmVjMThjZTkyYmVlMzhhNWE5ZGVkMDUzYjE2NTA0Y2M0NmUxYWI4ODg0NmYxMmZjMDljMSZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QifQ.hn6EDW1eCK1AOOo7I77njFUspVoIxag2_bk1BwJxfQE)要好，但是至少能用，不是吗？

## 这是否是开源的未来（哪怕是部分），还是只是一次恶搞？

**1. 积极视角：极致的 DRY (Don't Repeat Yourself)**

- **维护成本极低** ：作者无需关心 Xcode 版本升级、Swift 语法迭代，只需提供一份“要求文档”。
- **可复现性** ：只要 AI 模型能力在线，任何人在任何时间都能生成出功能一致的 App。
- **分享便捷** ：这样的分享干脆直接，比分享一个纯vibe出来的一大堆代码库相比起来或许还要好些。

**2. 略微消极的视角：（不是那种俗套的说辞）**

- **不可控性** ：生成的代码质量高度依赖 AI 的“心情”，难以确保每一次生成的效果一致，比如我的Codex的版本虽然可用，但确实不如作者的演示好看。
- **不方便操作** ：如果要生成代码，还是得确保用户本身有AI环境，而且有足够的资金配置，这种项目比较小还好说，如果是较大的项目的话就比较贵了。而且需要用户等待其结果生成，并不如直接下载作者发布的release。

![我与作者的结构对比](https://img.markxu.icu/imgContrastBetweenMineandAuthor.png)

总的来说，我认为这一次尝试不是件坏事，相反作者特别具有创意的repo发布方式还带给了我点小小的震撼。其实可以把这次看作一个更好的AI教程，而不是具体实现项目的方式，因为如果想要达到作者这样的prompt的话,还是需要一定的功底和基础知识。不说高手的情况，单论我自己，是无法做到一次性就写出像作者这么完美的提示词的。

如果大家有空闲的话也推荐大家都去试一试！😉
