---
name: rom-scanner-hashing
description: Use this skill when implementing ROM scanning and CRC hashing logic for matching local files against the GameBase64 database.
version: 1.0.0
author: 64Box
tags: [rom-scanner, crc32, rust, tauri, zip]
---

# ROM Scanner & CRC Hashing

## When to Use This Skill

- When writing Rust backend commands to scan a user's local directories for games.
- When implementing CRC32 hashing to match local files against the `Games` database.
- When linking discovered `.zip`, `.d64`, `.t64`, `.tap`, or `.crt` files to metadata.

## 1. Memory Management & Streaming

Never load entire files or large file sets into RAM at once.

- Do not use `std::fs::read(path)` or `std::fs::read_to_string(path)` for scanner hashing.
- Use `std::fs::File`, `std::io::BufReader`, and `crc32fast` to hash uncompressed files in chunks.

```rust
use crc32fast::Hasher;
use std::fs::File;
use std::io::{BufRead, BufReader};

let file = File::open(path)?;
let mut reader = BufReader::new(file);
let mut hasher = Hasher::new();
let mut buffer = [0; 8192];

while let Ok(count) = reader.read(&mut buffer) {
    if count == 0 { break; }
    hasher.update(&buffer[..count]);
}
let crc = hasher.finalize();
```

## 2. Zip File Optimization

Most official GameBase64 collection files are zipped.

- Do not extract and hash the archive contents just to find CRC.
- Read CRC32 directly from the zip central directory with a crate such as `zip` or `async_zip`.

## 3. Database Matching & Formatting

- Format CRC output as a padded 8-character hexadecimal string.
- Match with case-insensitive queries such as:

```sql
SELECT GA_Id, Name FROM Games WHERE CRC = ? COLLATE NOCASE
```

## 4. UI Non-Blocking & IPC Progress

- Run scanning work asynchronously with `tokio::task::spawn_blocking` or `tauri::async_runtime`.
- Emit progress events over Tauri IPC so the frontend can keep the UI responsive.

Example event payload:

```rust
tauri::Window::emit("scan-progress", { "scanned": 1500, "total": 30000, "current_file": "Commando.zip" })
```
