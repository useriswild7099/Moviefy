@echo off
setlocal
cd /d "%~dp0"
title MOVIEFY Launcher ^| Lights, Camera, Career

echo.
echo ========================================
echo         STARTING MOVIEFY...
echo    (Abandon all mindless content here)
echo ========================================
echo.

cd frontend

:: Ensure dependencies are installed
if not exist "node_modules\" (
    echo [INFO] First time setup: Installing dependencies...
    call npm install
)

:: Start Browser
echo Launching your browser...
echo (Preparing to wash your brain with the good stuff...)
start http://localhost:5173

:: Start Server
echo Starting the frontend server on http://localhost:5173
echo.
echo [IMPORTANT] Keep this window open. 
echo.
call npm run dev
pause
