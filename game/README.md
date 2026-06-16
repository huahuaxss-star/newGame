# 河马返乡记 — Web 原型（第一章垂直切片）

一只只想回马戏团躺平的废柴河马，用"坐下、打喷嚏、抢早餐"被动碾压一切，
一路被世界误认成英雄。**你卷的不是变强，是被误会得多离谱。**

## 怎么跑

```bash
cd game
python3 -m http.server 8123
# 然后浏览器打开 http://localhost:8123
```

（必须用本地服务打开，不能直接双击 index.html —— 浏览器会拦截 fetch 配置文件。）

## 怎么打包成 HTML

```bash
npm run build:html
```

生成 `dist/index.html`。这个文件已经内联配置、美术和音频，可以直接双击打开。

## 怎么测

```bash
cd game
npm test        # 或：node --test 'tests/*.test.js'
```

## 结构

- `src/` —— 纯逻辑（battle/skills/events/titles/gacha，已单测）+ 表现层（main.js 状态机 / fx 打击感 / audio 合成音效 / style.css）
- `config/` —— 所有数值与内容（改这里不动代码）：balance / enemies / skills / events / titles / gacha / chapter1
- `assets/` —— 美术槽位。丢同名 PNG 进去即生效，**缺图自动用 emoji 占位，不会崩**。清单见 `assets/README.md`
- `tests/` —— `node --test` 单测（零依赖）

## 第一章流程

早餐店（发现要付钱）→ 仓库找面包（误拆贼窝）→ 误伤战斗（坐下压扁盗贼）→
三选一蠢技能 → 甜点扭蛋 → 领奖章（"……早餐呢？"）→ 结算 / 再来一局
