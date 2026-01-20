@echo off
echo ========================================
echo   Medical MCQ Platform - Admin Dashboard
echo ========================================
echo.
echo Starting admin dashboard...
echo Server will run on: http://localhost:5174
echo.

cd /d "%~dp0"
npm run dev

pause
