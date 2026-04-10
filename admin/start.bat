@echo off
:: Flashmob Admin — Lance le serveur et ouvre le navigateur

set PORT=8090
set URL=http://localhost:%PORT%
set DIR=%~dp0

:: Si le serveur tourne déjà, juste ouvrir le navigateur
curl -s %URL% >nul 2>&1
if %errorlevel%==0 (
  start %URL%
  exit /b
)

echo.
echo   Flashmob Admin
echo   %URL%
echo   Ctrl+C pour arreter
echo.

start "" %URL%
python "%DIR%server.py"
