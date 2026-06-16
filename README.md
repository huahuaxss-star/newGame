# 少爷，请买单！

一只被魔术箱意外发射出去的马戏团河马，只想回家蹭顿免费早餐。
仿《Capybara GO》的横版闯关 + 自走战斗 roguelike，纯 Web（HTML/CSS/JS，无需编译）。

## 一键启动

- **macOS**：双击 `启动游戏.command`
- **Windows**：双击 `启动游戏.bat`

会自动开启本地服务器并打开浏览器（http://localhost:8123）。
**保持弹出的命令行窗口开启**；关闭该窗口即停止游戏。

> macOS 首次双击若提示"无法打开"，右键 → 打开 → 打开，或在终端执行：
> `chmod +x 启动游戏.command` 后再双击。
> 需要已安装 Python 3。

## 手动启动（备选）

```bash
cd game
python3 serve.py
# 浏览器打开 http://localhost:8123
```

`serve.py` 是禁用缓存的开发服务器：每次普通刷新都拿到最新文件，不用硬刷新。

## 打包成单个 HTML

```bash
cd game
npm run build:html
```

产物在 `game/dist/index.html`，可以直接双击打开，不需要启动本地服务器。

## 目录结构

- `game/` — 游戏本体（`index.html` 入口，`src/` 逻辑，`config/` 数值配置，`assets/` 美术与音频）
- `game/tests/` — 纯逻辑单元测试：`cd game && node --test 'tests/*.test.js'`
- `美术/` — 美术源文件
- `音乐/` — 音乐与配音源文件
- `*.md` — 设计文档（玩法 Spec、开场设计、美术需求、playtest 记录等）
- `参考视频.mp4` / `参考视频分析.md` — 参考原型与分析
