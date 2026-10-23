@echo off
setlocal
title 天气系统 - 一键停止
echo ============================================
echo   天气系统一键停止
echo ============================================
echo.
echo 停止后端（端口 8091）...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8091 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo 停止前端（端口 5173）...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo.
echo 已全部停止。如残留窗口可直接关闭“后端-8091”“前端-5173”。
timeout /t 3 /nobreak >nul
exit /b 0
