@echo off
title Stop All Services
echo Stopping all services...

:: Stop Docker PostgreSQL
docker-compose down

:: Kill node processes (optional - closes all node)
taskkill /f /im node.exe 2>nul

echo.
echo All services stopped!
pause
