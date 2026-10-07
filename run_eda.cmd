@echo off
setlocal
set "PROJECT_ROOT=%~dp0"
set "PYTHON=%PROJECT_ROOT%.venv\Scripts\python.exe"
if not exist "%PYTHON%" set "PYTHON=%PROJECT_ROOT%..\movie-system\.venv\Scripts\python.exe"
if not exist "%PYTHON%" set "PYTHON=python"
"%PYTHON%" "%PROJECT_ROOT%algorithm\run_eda.py" --input "%PROJECT_ROOT%data\raw\GlobalWeatherRepository.csv" --output-dir "%PROJECT_ROOT%"
if errorlevel 1 goto :eof
rem 图表保留在根目录 figures\，报告与数据画像按仓库规范复制到 data\profile\
copy /y "%PROJECT_ROOT%EDA_REPORT.md" "%PROJECT_ROOT%data\profile\EDA_REPORT.md" >nul
copy /y "%PROJECT_ROOT%data_profile.json" "%PROJECT_ROOT%data\profile\data_profile.json" >nul
del "%PROJECT_ROOT%EDA_REPORT.md" "%PROJECT_ROOT%data_profile.json" >nul 2>&1
endlocal
