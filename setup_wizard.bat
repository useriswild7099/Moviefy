@echo off
setlocal
cd /d "%~dp0"
title MOVIEFY Setup Wizard ^| Preparing and Elevating

echo.
echo ========================================
echo        MOVIEFY SETUP WIZARD
echo    (Prepare for Cinematic Growth)
echo ========================================
echo.

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found! Even the best directors need a script.
    echo Please install Python 3.8 or higher.
    echo Download at: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/3] Creating Virtual Environment...
echo (Building a digital sanctuary for your career...)
if not exist "venv" (
    python -m venv venv
    echo Virtual environment created. Your sanctuary is ready.
) else (
    echo Virtual environment already exists. No need to build it twice.
)

echo.
echo [2/3] Installing Dependencies...
echo (Fast-tracking via pre-compiled binaries...)
echo.
call venv\Scripts\activate.bat
pip install --prefer-binary -r backend/requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install dependencies. 
    echo Maybe your internet connection is playing hard to get?
    pause
    exit /b 1
)

echo.
echo [3/3] Finalizing Setup...
if not exist "frontend\dist" (
    echo [WARNING] Frontend build not found! 
    echo This is a bit like a movie without a screen.
)

echo.
echo ========================================
echo        SETUP COMPLETE!
echo    Your future self is thanking you.
echo ========================================
echo.
echo You can now exit this mundane window and run:
echo START_MOVIEFY.bat
echo.
pause
