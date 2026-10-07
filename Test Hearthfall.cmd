@echo off
cd /d "%~dp0"
node scripts\launch.cjs --exploration --hearthfall
if errorlevel 1 pause
