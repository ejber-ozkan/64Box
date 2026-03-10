name: tauri-architecture
description: Use this skill when implementing the desktop wrapper for 64Box using Tauri and Rust. It enforces secure IPC communication, local file system scanning, and external process execution.

Tauri & Rust Architecture for 64Box

When to Use This Skill

When setting up the Tauri backend (Phase 3).

When writing Rust commands to scan the user's local disk for .d64, .t64, or .tap files.

When writing the logic to launch external emulators (like VICE/x64sc.exe).

Instructions & Strict Rules

1. No Node.js / Electron Fallbacks

You are building a Tauri app. Do not attempt to use Node.js modules like fs or child_process in the React frontend. All system-level operations must be written in Rust inside src-tauri/src/main.rs (or modularized Rust files) and exposed to the frontend via Tauri Commands (#[tauri::command]).

2. ROM Scanning & Hashing

When implementing the auto-scanner:

Do not load entire ROM files into memory to hash them.

Use efficient streaming/chunking in Rust to calculate CRC32 hashes of local .d64/.t64 files to match against the Gamebase64 database.

Return structured JSON payloads to the frontend asynchronously.

3. Executing External Emulators

To launch VICE (x64sc.exe or macOS equivalent):

Use std::process::Command in Rust.

Ensure you pass the correct command-line arguments based on the GB64 metadata passed from the frontend (e.g., passing -true-drive-emulation if the game requires it).

Security: Do not allow the frontend to pass arbitrary strings directly to the shell execution. Validate all paths and emulator flags in the Rust backend before spawning the process.

4. Database Access

For desktop, the SQLite Gamebase64 database should be queried directly using a Rust SQLite crate (like rusqlite or sqlx) rather than handling massive JSON blobs in the React frontend.