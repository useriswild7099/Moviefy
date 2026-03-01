@echo off
setlocal
title MOVIEFY Launcher

echo.
echo ========================================
echo         STARTING MOVIEFY...
echo ========================================
echo.

if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Setup not found!
    echo Please run 'setup_wizard.bat' first.
    pause
    exit /b 1
)

:: Activate venv
call venv\Scripts\activate.bat

:: Start Browser
echo Launching your browser...
start http://localhost:8000

:: Start Server
echo Starting the server on http://localhost:8000
echo.
echo (Keep this window open while using the app)
echo.
python -m uvicorn backend.index:app --host 0.0.0.0 --port 8000 --log-level info
pause
