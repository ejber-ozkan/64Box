@echo off
setlocal enabledelayedexpansion

:: Ensure Cargo/Rust binaries added by Rustup are available in this shell session
set PATH=%USERPROFILE%\.cargo\bin;%PATH%

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
