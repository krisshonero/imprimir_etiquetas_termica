@echo off
title Servicio de Impresión V2 - Distrito Urbano
echo ========================================
echo   Servicio de Impresión de Tickets V2
echo ========================================
echo.
echo Iniciando el servicio...
echo Los registros quedan en la carpeta logs
echo Presiona Ctrl+C para detenerlo.
echo.
cd /d "%~dp0"

:loop
node main_v2.js
echo.
echo [!] El servicio se ha detenido. Reiniciando en 5 segundos...
timeout /t 5 /nobreak >nul
goto loop
