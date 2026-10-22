@echo off
setlocal enabledelayedexpansion
set "BASE=http://127.0.0.1:8091"
set /a PASS=0,FAIL=0
for %%P in (/api/health /api/summary /api/cleaning /api/conditions?limit=5 /api/trend?days=30 /api/map /api/cities?q=China /api/recommend?limit=3 /api/eda /api/ml) do (
  curl -s -o nul -m 90 -w "%%{http_code}" "%BASE%%%P" > "%TEMP%\weather_code.txt"
  set /p CODE=<"%TEMP%\weather_code.txt"
  if "!CODE!"=="200" (set /a PASS+=1 & echo [PASS] !CODE! %%P) else (set /a FAIL+=1 & echo [FAIL] !CODE! %%P)
)
echo Result: !PASS! passed, !FAIL! failed
del "%TEMP%\weather_code.txt" >nul 2>&1
endlocal
