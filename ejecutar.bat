@echo off
title Servicio de Impresión - Distrito Urbano
echo ========================================
echo   Servicio de Impresión de Tickets
echo ========================================
echo.
echo Iniciando el servicio...
echo Presiona Ctrl+C para detenerlo.
echo.

:loop
node main.js
echo.
echo [!] El servicio se ha detenido. Reiniciando en 5 segundos...
timeout /t 5 /nobreak >nul
goto loop