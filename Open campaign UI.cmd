@echo off
cd /d "%~dp0"
node scripts\campaign-ui.cjs
if errorlevel 1 pause
