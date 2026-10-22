@echo off
setlocal
cd /d "%~dp0"
if not exist ".runtime\tomcat" mkdir ".runtime\tomcat"
if not exist ".runtime\tmp" mkdir ".runtime\tmp"
if not exist ".runtime\docbase" mkdir ".runtime\docbase"
if "%WEATHER_DATABASE_URL%"=="" set "WEATHER_DATABASE_URL=jdbc:mysql://127.0.0.1:3306/weather_springboot?useUnicode=true^&characterEncoding=utf8^&serverTimezone=Asia/Shanghai"
if "%WEATHER_DATABASE_USERNAME%"=="" set "WEATHER_DATABASE_USERNAME=root"
if "%WEATHER_ADMIN_PASSWORD%"=="" set "WEATHER_ADMIN_PASSWORD=change-me"
set "JAVA_TOOL_OPTIONS=-Djava.io.tmpdir=%CD%\.runtime\tmp"
echo Set WEATHER_DATABASE_PASSWORD before running this script.
mvn spring-boot:run -Dspring-boot.run.profiles=mysql
endlocal
