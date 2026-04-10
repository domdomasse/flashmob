@echo off
:: Flashmob — Lance le site en local et ouvre le navigateur

set PORT=8080
set URL=http://localhost:%PORT%
set DIR=%~dp0

:: Si le serveur tourne déjà, juste ouvrir le navigateur
curl -s %URL% >nul 2>&1
if %errorlevel%==0 (
  start %URL%
  exit /b
)

echo.
echo   Flashmob
echo   %URL%
echo   Ctrl+C pour arreter
echo.

start "" %URL%
python -m http.server %PORT% --directory "%DIR%"
