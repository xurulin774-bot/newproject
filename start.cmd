@echo off
setlocal
set "PROJECT_ROOT=%~dp0"
set "PYTHON=%PROJECT_ROOT%.venv\Scripts\python.exe"
if not exist "%PYTHON%" set "PYTHON=%PROJECT_ROOT%..\movie-system\.venv\Scripts\python.exe"
if not exist "%PYTHON%" set "PYTHON=python"
echo Starting weather-system on http://127.0.0.1:8090/
"%PYTHON%" "%PROJECT_ROOT%backend\app.py" --host 127.0.0.1 --port 8090
endlocal
