---
title: "配置Mac终端日记"

date: "2026-04-07"

summary: "我以前的终端被 oh-my-zsh 和各类插件塞的满满的，界面还丑到自己都不愿意用。所以这次我打算从0开始，完整的重新构建一下我的终端。"

tags: ["MacOS","Terminal","Tools","Beautify"]

category: "tech"

image: "https://img.markxu.icu/img4d29eab0f1dc8.jpeg"
---
以前为了探索和好玩，我的终端被 oh-my-zsh 和各类插件塞的满满的，都记不住已经安装哪些插件了，而且界面还丑到自己都不愿意用。最近在Bilibili上看到了ghostty 这个命令行工具，同时刷到了些美化的操作，让我很是喜欢。于是这次我决定从0开始，完整的构建并美化一下我的终端。

---

说起终端命令行，在我刚刚购入 Mac 并配置好环境后，我就开始使用了，对于 Raycast，Bartender 等等这类自定义的美化工具完全不知晓，更不用说以前从来没有使用习惯的命令行了。后来我哥打算教我些知识，打开我的电脑发出一声惊呼：“你的电脑怎么这么原始？" 从那以后，我才注意到原来 Mac 的使用习惯与 Windows差别这么大（其实 Windows 我也是以简洁为主），开始探索开自定义的美化效果。

## 混乱的开始

后面很长的一段时间，我的终端都是类似于默认情况下的样子（忘记截图留证了），是那种灰色打底，只有文字的样子，也跟着网上各种视频安装了iterm2 以及 oh-my-zsh，还有一大堆插件，后来太乱要么忘记怎么使用，要么根本用不到。虽说这个终端也可以正常使用，但常常要进行不同插件的更新，而且开启终端都要一秒多的滞后，还是有些感到头疼。

于是我决定开始重构，顺便记录下来，也为最近新购置 Mac 的同学终端配置提供一份思路。

## 工欲善其事，必先利其器

选择一个合适且好用的工具是我们这次重构的重点，先简单介绍下我选择的标准：

1. 性能优先：启动时间短，渲染快。
2. 维护成本低：开箱即用，且适合定制，而且定制路径清晰，不依赖插件堆叠。
3. 好看：好看是第一生产力。🥰

所以我选择了以 Ghostty + 原生Zsh + Starship + Yazi 的组合，这些完全覆盖了我现在有的需求(还有些小的后面会添加上)，其他的插件在这么长的时间内我都没有用到过，所以安装oh-my-zsh目前的意义也不大，可以看[这篇文章](https://thevaluable.dev/zsh-install-configure-mouseless/)，里面也是这个思想。

接下来我来介绍下这几个软件吧

### Ghostty：终端模拟器

[官方回答：](https://ghostty.org/docs)

> Ghostty is a fast, feature-rich, and cross-platform terminal emulator that uses platform-native UI and GPU acceleration.

同生态位的工具：Terminal（原装）、iTerm2、Warp、WezTerm、Alacritty、Kitty...

为什么这么多选项选择Ghostty呢？其实我是看到了 [Boris Cherny 推荐的](https://x.com/bcherny/status/2017742753971769626)才想去试一试，结果发现这居然很适合我！

![Boris Cherny 推荐](https://img.markxu.icu/imgBorisRecommendGhostty.png)

* 采用的Zig编译为原生机器码，省掉了虚拟机/解释器的开销，没有GC暂停。
* 字符缓冲区直接映射到GPU显存，跳过了CPU中转。
* 启动的时候一次性解析TOML配置，没有插件热重载，大大加快了其运行的速度。而且配置都放在一个TOML里面，让他的设置也很简单明了。

使用下来，他的启动速度要快的多，而且内存占用也不算大。是一个我能想到现代终端最好的样子了。

### Starship：提示符引擎

同生态位的工具：oh-my-posh

使用 Rust 编写，是编译好的程序，启动速度贼快，而且作为提示符引擎（上皮肤），替换掉了我之前安装oh-my-zsh（每次启动要跑一堆shell脚本）的主要用途，现在启动速度快了，用起来自然也就舒服了😊。

### Yazi：异步文件管理器

这个其实和macOS finder差不多，只是通过键盘操作全部解决了，而且在对自己机器环境了解的情况下使用起来更舒服些。

同样是使用 Rust 编写，加载速度快，而且支持实时预览，不用再找到文件按空格查看具体内容，图片也可以预览，代替了大量的cd 和 ls，舒服许多许多。

![Yazi预览效果真的很好](https://img.markxu.icu/imgyazi.png)

更不用说其使用了原生的Vim键位，操作起来舒服很多，就算没有用过vim的用户，大概率上手也可以使用的七七八八，而且 ？帮助菜单很友好。

## 配置过程：简单的可复现操作

### 前提要求

安装好Homebrew（命令行应用商店？）、Nerdfont（终端的有趣图标字体）

安装Homebrew命令

```Bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

更新Homebrew

```Bash
brew update
```

### 下载软件

```Bash
# 字体
brew install --cask font-jetbrains-mono-nerd-font

# 终端模拟器
brew install --cask ghostty

# 提示符引擎
brew install starship

# 文件管理器 + 预览依赖
brew install yazi ffmpegthumbnailer sevenzip poppler jq fd ripgrep fzf

#其他使用工具
#命令自动建议+高亮
brew install zsh-autosuggestions zsh-syntax-highlighting
```

### 软件配置

打开Ghostty，点击 `command + ，` 会弹出一个toml文件，在里面可以直接复制我的内容：

```toml
# ===== 字体设置（必须！） =====
font-family = JetBrainsMono Nerd Font
font-size = 14

# ===== 窗口大小 =====
window-padding-x = 12
window-padding-y = 12

# ===== 指针模式为block，可以替换 =====
cursor-style = block
scrollback-limit = 10000
copy-on-select = true

# ===== 我觉得好看的主题 =====
theme = Catppuccin Mocha

# ===== 快捷按钮，cmd加数字前面的波浪线触发 =====
keybind = cmd+`=toggle_quick_terminal
```

现在终端应该已经很好看了

接下来是Starship,[官方文档](https://starship.rs/config/#:~:text=To%20get%20started%20configuring%20starship%2C)。

创建配置文件：

```bash
mkdir -p ~/.config && touch ~/.config/starship.toml
```

打开配置文件：
（如果不熟悉nano或者vim的话，可以安装vscode使用code + 地址进行打开，这样有图形化界面）

```bash
nano ~/.config/starship.toml
```

我的配置：

```Bash
"$schema" = 'https://starship.rs/config-schema.json'

format = """
[](red)\
$os\
$username\
[](bg:peach fg:red)\
$directory\
[](bg:yellow fg:peach)\
$git_branch\
$git_status\
[](fg:yellow bg:green)\
$c\
$rust\
$golang\
$nodejs\
$php\
$java\
$kotlin\
$haskell\
$python\
[](fg:green bg:sapphire)\
$conda\
[](fg:sapphire bg:lavender)\
$time\
[ ](fg:lavender)\
$cmd_duration\
$line_break\
$character"""

palette = 'catppuccin_mocha'

[os]
disabled = false
style = "bg:red fg:crust"

[os.symbols]
Windows = ""
Ubuntu = "󰕈"
SUSE = ""
Raspbian = "󰐿"
Mint = "󰣭"
Macos = "󰀵"
Manjaro = ""
Linux = "󰌽"
Gentoo = "󰣨"
Fedora = "󰣛"
Alpine = ""
Amazon = ""
Android = ""
AOSC = ""
Arch = "󰣇"
Artix = "󰣇"
CentOS = ""
Debian = "󰣚"
Redhat = "󱄛"
RedHatEnterprise = "󱄛"

[username]
show_always = true
style_user = "bg:red fg:crust"
style_root = "bg:red fg:crust"
format = '[ $user]($style)'

[directory]
style = "bg:peach fg:crust"
format = "[ $path ]($style)"
truncation_length = 3
truncation_symbol = "…/"

[directory.substitutions]
"Documents" = "󰈙 "
"Downloads" = " "
"Music" = "󰝚 "
"Pictures" = " "
"Developer" = "󰲋 "

[git_branch]
symbol = ""
style = "bg:yellow"
format = '[[ $symbol $branch ](fg:crust bg:yellow)]($style)'

[git_status]
style = "bg:yellow"
format = '[[($all_status$ahead_behind )](fg:crust bg:yellow)]($style)'

[nodejs]
symbol = ""
style = "bg:green"
format = '[[ $symbol( $version) ](fg:crust bg:green)]($style)'

[c]
symbol = " "
style = "bg:green"
format = '[[ $symbol( $version) ](fg:crust bg:green)]($style)'

[rust]
symbol = ""
style = "bg:green"
format = '[[ $symbol( $version) ](fg:crust bg:green)]($style)'

[golang]
symbol = ""
style = "bg:green"
format = '[[ $symbol( $version) ](fg:crust bg:green)]($style)'

[php]
symbol = ""
style = "bg:green"
format = '[[ $symbol( $version) ](fg:crust bg:green)]($style)'

[java]
symbol = " "
style = "bg:green"
format = '[[ $symbol( $version) ](fg:crust bg:green)]($style)'

[kotlin]
symbol = ""
style = "bg:green"
format = '[[ $symbol( $version) ](fg:crust bg:green)]($style)'

[haskell]
symbol = ""
style = "bg:green"
format = '[[ $symbol( $version) ](fg:crust bg:green)]($style)'

[python]
symbol = ""
style = "bg:green"
format = '[[ $symbol( $version)(\(#$virtualenv\)) ](fg:crust bg:green)]($style)'

[docker_context]
symbol = ""
style = "bg:sapphire"
format = '[[ $symbol( $context) ](fg:crust bg:sapphire)]($style)'

[conda]
symbol = "  "
style = "fg:crust bg:sapphire"
format = '[$symbol$environment ]($style)'
ignore_base = false

[time]
disabled = false
time_format = "%R"
style = "bg:lavender"
format = '[[  $time ](fg:crust bg:lavender)]($style)'

[line_break]
disabled = true

[character]
disabled = false
success_symbol = '[❯](bold fg:green)'
error_symbol = '[❯](bold fg:red)'
vimcmd_symbol = '[❮](bold fg:green)'
vimcmd_replace_one_symbol = '[❮](bold fg:lavender)'
vimcmd_replace_symbol = '[❮](bold fg:lavender)'
vimcmd_visual_symbol = '[❮](bold fg:yellow)'

[cmd_duration]
show_milliseconds = true
format = " in $duration "
style = "bg:lavender"
disabled = false
show_notifications = true
min_time_to_notify = 45000

[palettes.catppuccin_mocha]
rosewater = "#f5e0dc"
flamingo = "#f2cdcd"
pink = "#f5c2e7"
mauve = "#cba6f7"
red = "#f38ba8"
maroon = "#eba0ac"
peach = "#fab387"
yellow = "#f9e2af"
green = "#a6e3a1"
teal = "#94e2d5"
sky = "#89dceb"
sapphire = "#74c7ec"
blue = "#89b4fa"
lavender = "#b4befe"
text = "#cdd6f4"
subtext1 = "#bac2de"
subtext0 = "#a6adc8"
overlay2 = "#9399b2"
overlay1 = "#7f849c"
overlay0 = "#6c7086"
surface2 = "#585b70"
surface1 = "#45475a"
surface0 = "#313244"
base = "#1e1e2e"
mantle = "#181825"
crust = "#11111b"

[palettes.catppuccin_frappe]
rosewater = "#f2d5cf"
flamingo = "#eebebe"
pink = "#f4b8e4"
mauve = "#ca9ee6"
red = "#e78284"
maroon = "#ea999c"
peach = "#ef9f76"
yellow = "#e5c890"
green = "#a6d189"
teal = "#81c8be"
sky = "#99d1db"
sapphire = "#85c1dc"
blue = "#8caaee"
lavender = "#babbf1"
text = "#c6d0f5"
subtext1 = "#b5bfe2"
subtext0 = "#a5adce"
overlay2 = "#949cbb"
overlay1 = "#838ba7"
overlay0 = "#737994"
surface2 = "#626880"
surface1 = "#51576d"
surface0 = "#414559"
base = "#303446"
mantle = "#292c3c"
crust = "#232634"

[palettes.catppuccin_latte]
rosewater = "#dc8a78"
flamingo = "#dd7878"
pink = "#ea76cb"
mauve = "#8839ef"
red = "#d20f39"
maroon = "#e64553"
peach = "#fe640b"
yellow = "#df8e1d"
green = "#40a02b"
teal = "#179299"
sky = "#04a5e5"
sapphire = "#209fb5"
blue = "#1e66f5"
lavender = "#7287fd"
text = "#4c4f69"
subtext1 = "#5c5f77"
subtext0 = "#6c6f85"
overlay2 = "#7c7f93"
overlay1 = "#8c8fa1"
overlay0 = "#9ca0b0"
surface2 = "#acb0be"
surface1 = "#bcc0cc"
surface0 = "#ccd0da"
base = "#eff1f5"
mantle = "#e6e9ef"
crust = "#dce0e8"

[palettes.catppuccin_macchiato]
rosewater = "#f4dbd6"
flamingo = "#f0c6c6"
pink = "#f5bde6"
mauve = "#c6a0f6"
red = "#ed8796"
maroon = "#ee99a0"
peach = "#f5a97f"
yellow = "#eed49f"
green = "#a6da95"
teal = "#8bd5ca"
sky = "#91d7e3"
sapphire = "#7dc4e4"
blue = "#8aadf4"
lavender = "#b7bdf8"
text = "#cad3f5"
subtext1 = "#b8c0e0"
subtext0 = "#a5adcb"
overlay2 = "#939ab7"
overlay1 = "#8087a2"
overlay0 = "#6e738d"
surface2 = "#5b6078"
surface1 = "#494d64"
surface0 = "#363a4f"
base = "#24273a"
mantle = "#1e2030"
crust = "#181926"
```

如果你想要别的主题，可以用下这个命令查看其支持的主题，如果你想要别的可以问下ai怎么办

```bash
starship preset --list
```

运行后会列出一组可选预设，比如 `bracketed-segments`、`catppuccin-powerline`、`tokyo-night` 等等。

选中安装

```bash
starship preset tokyo-night > ~/.config/starship.toml
```

最后就是配置一下Zsh了，建议直接复制到后面，不要覆盖（因为里面包含了conda环境，node环境等等，可以考虑先问下ai）

```bash
nano ~/.zshrc
```

```Bash
# ===== Homebrew: macOS 包管理器=====
export PATH="/opt/homebrew/bin:$PATH"

# ===== Starship ======
eval "$(starship init zsh)"

# ===== 自动补全 ======
autoload -Uz compinit && compinit

# ===== Yazi（终端文件管理器）=====
function y() {
  local tmp="$(mktemp -t "yazi-cwd.XXXXXX")" cwd
  yazi "$@" --cwd-file="$tmp"
  if cwd="$(command cat -- "$tmp")" && [ -n "$cwd" ] && [ "$cwd" != "$PWD" ]; then
    builtin cd -- "$cwd"
  fi
  rm -f -- "$tmp"
}

# yy 是 yazi 的快捷命令
alias yy="y"

#=====Zsh Autosuggestions =====
source /opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh

# ===== Zsh Syntax Highlighting =====
source /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh

```

### 验证阶段

```bash
exec zsh
```

### 如果你有安装vscode

如果你有安装vscode等编译器，想要在里面也使用正常的终端，但是却看到很多奇异字符，那是由于字体不对导致的。可以打开设置，搜索 `terminal font` 然后输入 `JetBrainsMono Nerd Font`即可。

这样你就完成了一个美观又实用的终端了！

## 为什么这值得花时间

![最后可以配置出来的结果](https://img.markxu.icu/imgfinalshowTerminal.png)

终端不仅仅是工具，更是开发者每天面对最长时间的工作台，更不用说现在vibe coding盛行的情况下，终端的使用越来越多。如果配置得当的话，会让你的整个思路都更清晰明了。

- Ghostty: [官网](https://ghostty.org) | [GitHub](https://github.com/ghostty-org/ghostty)
- Starship: [官网](https://starship.rs) | [GitHub](https://github.com/starship/starship)
- Yazi: [官网](https://yazi-rs.github.io) | [GitHub](https://github.com/sxyazi/yazi)

> 💡 本文配置基于以下版本验证：
>
> - Ghostty 1.3.1 (stable)
> - Starship 1.24.2
> - Yazi 0.3.0
>   不同版本配置语法可能有差异，如遇问题请先查看官网确认版本。
