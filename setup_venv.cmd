@echo off
setlocal
set "PROJECT_ROOT=%~dp0"
echo [weather-system] creating virtual environment .venv ...
python -m venv "%PROJECT_ROOT%.venv"
if errorlevel 1 (
    echo [weather-system] failed: make sure Python 3.10+ is installed and on PATH.
    exit /b 1
)
"%PROJECT_ROOT%.venv\Scripts\python.exe" -m pip install --upgrade pip -q
"%PROJECT_ROOT%.venv\Scripts\python.exe" -m pip install -r "%PROJECT_ROOT%requirements.txt" -q
if errorlevel 1 (
    echo [weather-system] pip install failed, check network or requirements.txt
    exit /b 1
)
echo [weather-system] done. start.cmd now prefers the local .venv.
endlocal
