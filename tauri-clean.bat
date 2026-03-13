@echo off
echo [64Box] Cleaning environment...

:: 1. Clear Next.js cache
if exist ".next" (
    echo [64Box] Removing .next cache...
    rmdir /s /q .next
)

:: 2. Clear Rust/Tauri build artifacts
if exist "src-tauri\target" (
    echo [64Box] Cleaning Rust target directory...
    cd src-tauri
    cargo clean
    cd ..
)

echo [64Box] Clean complete.
echo [64Box] Starting development environment...
call tauri-dev.bat
