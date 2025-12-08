@echo off
echo ===================================
echo  Discord Moderation Bot Setup
echo ===================================
echo.

echo [1/4] Installing root dependencies...
call npm install

echo.
echo [2/4] Installing bot dependencies...
cd bot
call npm install
cd ..

echo.
echo [3/4] Installing API dependencies...
cd api
call npm install
cd ..

echo.
echo [4/4] Installing web dependencies...
cd web
call npm install
cd ..

echo.
echo [5/5] Setting up database...
call npx prisma generate
call npx prisma db push

echo.
echo ===================================
echo  Setup complete!
echo ===================================
echo.
echo To seed database with test data:
echo   npm run db:seed
echo.
echo To start the bot:
echo   cd bot ^&^& npm run dev
echo.
echo To start the API:
echo   cd api ^&^& npm run dev
echo.
echo To start the web panel:
echo   cd web ^&^& npm run dev
echo.
echo Don't forget to add your DISCORD_TOKEN in .env!
echo.
pause
