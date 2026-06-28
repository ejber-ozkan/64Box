@echo off
setlocal enabledelayedexpansion

:: Enable launch logging to console during development
set VIC40_DEBUG_LAUNCH=1

:: Ensure Cargo/Rust binaries added by Rustup are available in this shell session
set PATH=%USERPROFILE%\.cargo\bin;%PATH%

:: Check for node_modules in a clean clone
if not exist "node_modules\" (
    echo [64Box] ERROR: node_modules folder not found.
    echo [64Box] Please run 'npm install' before starting the development server.
    pause
    exit /b 1
)

echo [64Box] Using Rust: 
rustc --version
cargo --version

:: Check if port 3000 is listening
netstat -ano | find "LISTENING" | find ":3000" > nul
if errorlevel 1 (
    echo [64Box] Frontend port 3000 not detected.
    echo [64Box] Launching 'npm run dev' in a separate window...
    start "64Box-Frontend" cmd /c "npm run dev"
    
    echo [64Box] Waiting 5 seconds for server to initialize...
    timeout /t 5 /nobreak > nul
) else (
    echo [64Box] Frontend already running on port 3000.
)

echo [64Box] Starting Tauri (connecting to http://localhost:3000)...
npx tauri dev --no-dev-server-wait --config tauri.dev-override.json
