@echo off
REM 《少爷，请买单！》一键启动（Windows）：双击本文件即可
cd /d "%~dp0game"
start "" http://localhost:8123
echo 少爷，请买单！已启动 ^-^> http://localhost:8123
echo （请保持本窗口开启；关闭此窗口即可停止游戏）
python serve.py || py serve.py
pause
