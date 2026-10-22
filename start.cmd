@echo off
setlocal
cd /d "%~dp0"
if not exist ".runtime\tomcat" mkdir ".runtime\tomcat"
if not exist ".runtime\tmp" mkdir ".runtime\tmp"
if not exist ".runtime\docbase" mkdir ".runtime\docbase"
set "JAVA_TOOL_OPTIONS=-Djava.io.tmpdir=%CD%\.runtime\tmp"
echo Starting Spring Boot weather system on http://127.0.0.1:8091/
mvn spring-boot:run
endlocal
