@echo off
REM ============================================================================
REM Medical MCQ App - Start Script
REM ============================================================================

setlocal enabledelayedexpansion

REM Change to app directory
cd /d "%~dp0"

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo.
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if port 3000 is already in use
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    echo.
    echo WARNING: Port 3000 is already in use
    echo Attempting to stop the process...
    taskkill /pid %%a /f
    timeout /t 1 /nobreak
)

REM Start the app
echo.
echo ============================================================================
echo Starting Medical MCQ App...
echo ============================================================================
echo.
echo Server starting on http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

node server/index.js

REM If server exits, show message
if %errorlevel% equ 0 (
    echo.
    echo Server stopped normally
) else (
    echo.
    echo ERROR: Server exited with error code %errorlevel%
)

pause
