name: rom-scanner-hashing description: Use this skill when implementing the ROM scanning and CRC hashing logic. It defines strict memory-safe rules for matching local files to the Gamebase64 database.

ROM Scanner & CRC Hashing (Tauri / Rust)

When to Use This Skill

When writing the Tauri Rust backend commands to scan a user's local directory for games.

When implementing CRC32 hashing to match local files against the CRC column in the Games database.

When linking discovered .zip, .d64, .t64, .tap, or .crt files to their metadata.

1. Memory Management & Streaming (Strict Rule)

You must never load entire files or massive sets of files into RAM simultaneously.

Do NOT use: std::fs::read(path) or std::fs::read_to_string(path).

Use Streaming: For uncompressed files, read the file in chunks using std::fs::File, std::io::BufReader, and a highly optimized hashing crate like crc32fast.

// Correct Pattern for Uncompressed Files
use crc32fast::Hasher;
use std::fs::File;
use std::io::{BufRead, BufReader};

let file = File::open(path)?;
let mut reader = BufReader::new(file);
let mut hasher = Hasher::new();
let mut buffer = [0; 8192]; // 8KB chunks

while let Ok(count) = reader.read(&mut buffer) {
    if count == 0 { break; }
    hasher.update(&buffer[..count]);
}
let crc = hasher.finalize();


2. The Zip File Optimization (Crucial)

The official Gamebase64 collection stores games almost exclusively as .zip files.

Rule: Do not extract or manually hash the contents of a .zip file to find its CRC.

Optimization: The CRC32 of the compressed file is already calculated and stored inside the Zip file's Central Directory Header. Use a crate like zip or async_zip to simply read the header of the archive in O(1) time. This reduces a 10-minute scan of 30,000 zipped games to mere seconds.

3. Database Matching & Formatting

When a CRC is extracted (either via streaming or Zip header), it must be correctly formatted to match the Gamebase64 database.

The CRC column in Games.csv stores hashes as hexadecimal strings (e.g., A1B2C3D4 or a1b2c3d4).

Ensure your Rust hash output is formatted as a padded, 8-character hex string before querying the SQLite database.

Example matching query: SELECT GA_Id, Name FROM Games WHERE CRC = ? COLLATE NOCASE

4. UI Non-Blocking & IPC Progress

Scanning a large directory will take time. The Rust backend must not block the main application thread, and the React frontend must not appear frozen.

Rule: Execute the scanning loop asynchronously (e.g., using tokio::task::spawn_blocking or tauri::async_runtime).

Rule: Emit continuous progress events over Tauri's IPC bridge to the frontend.

Example Event: tauri::Window::emit("scan-progress", { "scanned": 1500, "total": 30000, "current_file": "Commando.zip" })

The React frontend must listen for this event and update a visual progress bar.