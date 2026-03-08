@echo off
setlocal
echo ========================================================
echo Gamebase64 V19 MDB to SQLite Converter
echo ========================================================
echo.

set MDB_FILE=%~dp0..\GBC_v19.mdb
set EXPORT_DIR=%~dp0..\gb64_export
set POSh_32=%SystemRoot%\SysWOW64\WindowsPowerShell\v1.0\powershell.exe

if not exist "%MDB_FILE%" (
    echo [ERROR] Could not find GBC_v19.mdb at the project root.
    echo Please make sure the file is named exactly 'GBC_v19.mdb'.
    exit /b 1
)

echo [1/2] Extracting tables from MDB to CSV...
"%POSh_32%" -ExecutionPolicy Bypass -File "%~dp0exportMdb.ps1" -DbPath "%MDB_FILE%" -OutputDir "%EXPORT_DIR%"
if errorlevel 1 (
    echo [ERROR] Powershell export failed.
    exit /b 1
)

echo.
echo [2/2] Converting CSVs to optimized SQLite database...
call npm run --silent db:convert
if errorlevel 1 (
    echo [ERROR] Node.js conversion failed. Make sure you ran 'npm install'.
    exit /b 1
)

echo.
echo [SUCCESS] gb64.sqlite has been successfully generated in the project root!
endlocal
