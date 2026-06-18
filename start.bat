@echo off
REM Start the Git Changes Manager server and open it in the browser.
cd /d "%~dp0"
start "" http://localhost:3000
node server.js
pause
