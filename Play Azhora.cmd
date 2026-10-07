@echo off
cd /d "%~dp0"
node scripts\launch.cjs --exploration
if errorlevel 1 pause
