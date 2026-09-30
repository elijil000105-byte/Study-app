@echo off
rem Startar StudyAI lokalt. Dubbelklicka på filen.
cd /d "%~dp0"
python server.py 2>nul || py server.py
if errorlevel 1 (
  echo.
  echo Python hittades inte. Installera det fran https://www.python.org/downloads/
  pause
)
