---
name: tauri-architecture
description: Use this skill when implementing the 64Box desktop wrapper with Tauri and Rust, including secure IPC, local scanning, and external emulator launch flows.
version: 1.0.0
author: 64Box
tags: [tauri, rust, ipc, desktop, emulator]
---

# Tauri & Rust Architecture For 64Box

## When to Use This Skill

- When setting up the Tauri backend.
- When writing Rust commands to scan local disks for `.d64`, `.t64`, or `.tap` files.
- When implementing external emulator launch flows such as VICE or `x64sc.exe`.

## Instructions & Strict Rules

### 1. No Node.js / Electron Fallbacks

You are building a Tauri app. Do not use Node.js modules such as `fs` or `child_process` in the React frontend. All system-level operations must live in Rust and be exposed through Tauri commands.

### 2. ROM Scanning & Hashing

- Do not load entire ROM files into memory.
- Use efficient streaming and chunking in Rust to calculate CRC32 hashes.
- Return structured payloads asynchronously to the frontend.

### 3. Executing External Emulators

- Use `std::process::Command` in Rust.
- Pass only validated flags based on trusted metadata.
- Do not allow arbitrary frontend strings to flow directly into shell execution.
- Validate all emulator paths and launch flags before spawning.

### 4. Database Access

For desktop builds, query the SQLite GameBase64 database directly from Rust with a crate such as `rusqlite` rather than pushing massive JSON blobs into React.
