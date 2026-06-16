#!/bin/bash
# 《少爷，请买单！》一键启动（macOS）：双击本文件即可
cd "$(dirname "$0")/game" || { echo "找不到 game 目录"; read; exit 1; }
( sleep 1.2; open "http://localhost:8123" ) &
echo "《少爷，请买单！》已启动 → http://localhost:8123"
echo "（请保持本窗口开启；关闭此窗口即可停止游戏）"
PY=$(command -v python3 || command -v python)
if [ -z "$PY" ]; then echo "未找到 python3，请先安装 Python 3"; read; exit 1; fi
"$PY" serve.py
