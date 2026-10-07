@echo off
setlocal enabledelayedexpansion
set "BASE=http://127.0.0.1:8090"
set "LIST=%TEMP%\wx_paths.txt"
echo [weather-system] API smoke test against %BASE%
> "%LIST%" (
    echo /api/health
    echo /api/summary
    echo /api/cleaning
    echo /api/conditions?limit=5
    echo /api/trend?days=30
    echo /api/map
    echo /api/cities?q=China
    echo /api/recommend?mode=comfort^&limit=3
    echo /api/similar?k=China%%20%%7C%%20Beijing
    echo /api/plan?month=12^&mode=comfort^&limit=3
    echo /api/compare?k=China%%20%%7C%%20Beijing
    echo /api/forecast?days=14
    echo /api/clusters?k=4
    echo /api/eda
)
set /a pass=0, fail=0
for /f "usebackq delims=" %%P in ("%LIST%") do (
    curl -s -o nul -m 90 -w "%%{http_code}" "%BASE%%%P" > "%TEMP%\wx_code.txt" 2>nul
    set /p CODE=<"%TEMP%\wx_code.txt"
    set "URL=%%P"
    if "!CODE!"=="200" (
        set /a pass+=1
        echo   [PASS] !CODE! !URL!
    ) else (
        set /a fail+=1
        echo   [FAIL] !CODE! !URL!
    )
)
echo [weather-system] result: !pass! passed, !fail! failed
del "%LIST%" "%TEMP%\wx_code.txt" >nul 2>&1
endlocal
