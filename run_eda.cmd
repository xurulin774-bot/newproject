@echo off
setlocal
set "PROJECT_ROOT=%~dp0"
set "PYTHON=%PROJECT_ROOT%..\movie-system\.venv\Scripts\python.exe"
if not exist "%PYTHON%" set "PYTHON=python"
"%PYTHON%" "%PROJECT_ROOT%algorithm\run_eda.py" --input "%PROJECT_ROOT%data\raw\GlobalWeatherRepository.csv" --output-dir "%PROJECT_ROOT%"
endlocal
