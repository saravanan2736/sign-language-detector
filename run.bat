@echo off
rem Double-click to start the backend and the web UI. Close this window or press Q to stop.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" %*
if errorlevel 1 pause
