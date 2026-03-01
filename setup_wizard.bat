@echo off
setlocal
title MOVIEFY Setup Wizard

echo.
echo ========================================
echo        MOVIEFY SETUP WIZARD
echo ========================================
echo.

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found! Please install Python 3.8 or higher.
    echo Download at: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/3] Creating Virtual Environment...
if not exist "venv" (
    python -m venv venv
    echo Virtual environment created.
) else (
    echo Virtual environment already exists.
)

echo.
echo [2/3] Installing Dependencies...
echo This may take a minute...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul
pip install -r backend/requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)

echo.
echo [3/3] Finalizing Setup...
if not exist "frontend\dist" (
    echo [WARNING] Frontend build not found! 
    echo Please ensure the ZIP includes frontend/dist folder.
)

echo.
echo ========================================
echo        SETUP COMPLETE!
echo ========================================
echo.
echo You can now run MOVIEFY by double-clicking:
echo START_MOVIEFY.bat
echo.
pause
