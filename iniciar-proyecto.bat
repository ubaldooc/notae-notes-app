@echo off
title Servidor de Desarrollo (CMD + FNM)

echo Configurando el entorno de FNM...
REM Este comando configura la ruta a la version de Node.js activa en FNM.
FOR /F "tokens=*" %%i IN ('fnm env') DO %%i

echo.
echo Iniciando los servicios de frontend y backend...
npm run dev

pause
