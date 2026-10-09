@echo off
REM Civic Pulse - opens the site at http://localhost:8000 (needed for browser autofill,
REM "save password" and OpenStreetMap map tiles, which don't work when index.html is opened as a file).
cd /d "%~dp0"
start "" http://localhost:8000/
python -m http.server 8000 2>nul || py -m http.server 8000
if errorlevel 1 (
  echo.
  echo Python was not found. Install it from https://www.python.org/downloads/ ^(tick "Add Python to PATH"^),
  echo or run:  npx serve .
  pause
)
