@echo off
title Discord Moderation Bot - All Services
color 0A

echo ===================================
echo  Discord Moderation Bot Launcher
echo ===================================
echo.

:: Check if Docker PostgreSQL is running
docker ps | findstr discord-bot-db >nul 2>&1
if errorlevel 1 (
    echo [!] Starting PostgreSQL in Docker...
    docker-compose up -d
    timeout /t 5 /nobreak >nul
) else (
    echo [OK] PostgreSQL is running
)

echo.
echo Starting all services...
echo.

:: Start API server in new window
start "API Server" cmd /k "cd /d %~dp0api && echo Starting API Server on port 3001... && npm run dev"

:: Wait a bit for API to start
timeout /t 2 /nobreak >nul

:: Start Web panel in new window
start "Web Panel" cmd /k "cd /d %~dp0web && echo Starting Web Panel on port 3000... && npm run dev"

:: Wait a bit
timeout /t 2 /nobreak >nul

:: Start Bot in new window
start "Discord Bot" cmd /k "cd /d %~dp0bot && echo Starting Discord Bot... && npm run dev"

echo.
echo ===================================
echo  All services started!
echo ===================================
echo.
echo  API Server:  http://localhost:3001
echo  Web Panel:   http://localhost:3000
echo  Bot:         Running in separate window
echo.
echo  Close all windows to stop services.
echo ===================================
echo.
pause
