@echo off
setlocal enabledelayedexpansion
title 天气系统 - 一键启动
cd /d "%~dp0"

echo ============================================
echo   天气系统一键启动
echo   后端 Spring Boot  : http://127.0.0.1:8091
echo   前端 Vue (Vite)   : http://localhost:5173
echo ============================================
echo.

rem ---- 0. 结束残留的旧进程，避免端口占用 ----
echo [0/4] 清理残留进程...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8091,5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

rem ---- 1. 后端 jar 检查（缺失则现打包）----
echo [1/4] 检查后端...
if not exist "target\weather-system-springboot-1.0.0.jar" (
    echo   未找到可执行 jar，正在用 Maven 打包，首次约 1-2 分钟...
    call mvn -q -DskipTests clean package
    if errorlevel 1 (
        echo   Maven 打包失败，请检查 JDK 与 Maven 配置。
        pause
        exit /b 1
    )
) else (
    echo   后端 jar 已就绪。
)

rem ---- 2. 前端依赖检查（缺失则现安装）----
echo [2/4] 检查前端...
if not exist "frontend\node_modules" (
    echo   未找到 node_modules，正在安装依赖，首次较慢...
    pushd frontend
    call npm install --no-fund --no-audit
    popd
    if errorlevel 1 (
        echo   npm install 失败，请检查 Node.js 环境。
        pause
        exit /b 1
    )
) else (
    echo   前端依赖已就绪。
)

rem ---- 3. 在独立窗口启动后端与前端 ----
echo [3/4] 启动服务...
if not exist "logs" mkdir "logs"
if not exist ".runtime\tmp" mkdir ".runtime\tmp"
set "JAVA_TOOL_OPTIONS=-Djava.io.tmpdir=%CD%\.runtime\tmp"
start "后端-8091" /min cmd /c "java -jar target\weather-system-springboot-1.0.0.jar > logs\backend.log 2>&1"
start "前端-5173" /min cmd /c "cd /d frontend && npm run dev > ..\logs\frontend.log 2>&1"

rem ---- 4. 健康检查 ----
echo [4/4] 等待服务就绪...
set /a waited=0
:wait_backend
timeout /t 3 /nobreak >nul
set /a waited+=3
curl -s -m 3 -o nul http://127.0.0.1:8091/api/health
if errorlevel 1 (
    if !waited! lss 120 (
        echo   后端启动中... !waited!s
        goto wait_backend
    )
    echo   后端 120 秒内未就绪，请查看 logs\backend.log
    pause
    exit /b 1
)
echo   后端已就绪。
set /a waited=0
:wait_frontend
timeout /t 2 /nobreak >nul
set /a waited+=2
curl -s -m 3 -o nul http://localhost:5173/
if errorlevel 1 (
    if !waited! lss 60 (
        echo   前端启动中... !waited!s
        goto wait_frontend
    )
    echo   前端 60 秒内未就绪，请查看 logs\frontend.log
    pause
    exit /b 1
)
echo   前端已就绪。

echo.
echo ============================================
echo   启动完成！浏览器即将打开 http://localhost:5173
echo   登录账号：admin / 123456
echo   停止服务请运行 一键停止.cmd
echo ============================================
start "" http://localhost:5173/
timeout /t 5 /nobreak >nul
exit /b 0
