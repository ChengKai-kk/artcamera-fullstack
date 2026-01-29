@echo off
cd /d C:\Users\Administrator\Desktop\artcamera-fullstack\artcamera_backend
:loop
"C:\Program Files\nodejs\node.exe" index.js
timeout /t 5 >nul
goto loop
