@echo off
setlocal
cd /d "%~dp0"
set "PYTHON=%PYTHON_COMMAND%"
if "%PYTHON%"=="" set "PYTHON=python"
"%PYTHON%" algorithm\run_eda.py --input data\raw\GlobalWeatherRepository.csv --output-dir data\profile
if errorlevel 1 exit /b %errorlevel%
if not exist "src\main\resources\static\figures" mkdir "src\main\resources\static\figures"
copy /Y "data\profile\figures\*.png" "src\main\resources\static\figures\" >nul
echo EDA figures copied to src\main\resources\static\figures
endlocal
