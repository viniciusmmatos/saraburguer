@echo off
cls
echo Iniciando o servidor...

for /f "tokens=2 delims=:" %%f in ('ipconfig ^| findstr /c:"IPv4"') do set IP=%%f
set IP=%IP:~1%

echo.
echo Acesse o sistema em: http://%IP%:3000
echo.

node server.js

pause
