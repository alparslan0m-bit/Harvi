@echo off
setlocal
echo Starting MCQ Medical App server...

REM Ensure Node is installed and available in PATH
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo Node.js is not installed or not in PATH.
  echo Please install from https://nodejs.org and rerun.
  pause
  exit /b 1
)

REM Install dependencies if node_modules missing
if not exist node_modules (
  echo Installing dependencies...
  call npm install --no-audit --no-fund
)

REM Start server
start cmd /c "npm start"

REM Open browser
timeout /t 2 >nul
start http://localhost:3000/

pause
endlocal
