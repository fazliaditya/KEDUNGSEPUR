@echo off
cd /d "%~dp0"
start "SAPA WebGIS Server" cmd /k "py -m http.server 8777"
timeout /t 2 /nobreak >nul
start "" "http://localhost:8777/"
echo Browser akan menampilkan SAPA KEDUNGSEPUR 2045.
