# 64Box

A cross-platform (Windows, Mac, Linux) modern frontend for the **GameBase64** Commodore 64 game database, built with Tauri, Rust, Next.js, and EmulatorJS. 

## Features
- **Modern Next.js Frontend**: Fluid, gallery-style layouts mimicking modern gaming libraries. Fully responsive and supports Gamepad/Keyboard navigation.
- **Deep Metadata Browsing**: Integrated search by year, publisher, musician, and smart genres, powered by a fast local SQLite database.
- **WASM Browser Emulation**: Play games directly inside the app using an offline-bundled EmulatorJS core without any external configuration.
- **Native Emulator Bridge**: Connect to an external `x64sc` (VICE) installation for high-accuracy native desktop emulation.
- **SID Support**: Native `.sid` chiptune playback directly within the game galleries.

## 1. Prerequisites

You'll need the following installed to build and run this project:
- [Node.js](https://nodejs.org/en) (v20+)
- [Rust](https://rustup.rs/) (for Tauri backend)
- [Tauri CLI Requirements](https://tauri.app/v1/guides/getting-started/prerequisites)

## 2. Setting up the Database and Assets

Because of copyright and sheer size, the GameBase64 database (`.mdb`) and its media files (`.zip`s containing screenshots, box art, game files) are **not** included with this repository.

1. **Download GameBase 64**: Go to the [GameBase64 website](http://www.gamebase64.com/) and download the core `GBC_v19.mdb` file. Place it in the root of this project.
2. **Download Media and Games**: You will need to obtain the GameBase64 collections (Games, Screenshots, BoxArt, Sid, Video) which are easily searchable online.
3. Extract the collections to your preferred location on your PC (you configure their paths later inside the app).

## 3. Building the SQLite Database

This application utilizes a highly optimized SQLite database (`gb64.sqlite`) generated from the original Access (`.mdb`) file. The conversion scripts are included.

### For Windows:
Ensure you natively have Windows ODBC drivers for Access, or check scripts for PowerShell dependencies.
```bash
# This uses the Windows ODBC driver to export the MDB to CSV, then to SQLite
.\scripts\import_gb64.bat
```

### For Linux/Mac:
You need `mdbtools` installed (`sudo apt install mdbtools` on Ubuntu, `brew install mdbtools` on Mac).
```bash
./scripts/mdb-export-all.sh
node ./scripts/convert_csv_to_sqlite.js
```

This will produce `gb64.sqlite` in the project root.

## 4. Running the Application in Development

```bash
# Install NPM dependencies
npm install

# Run the Tauri application (which also automatically launches the Next dev server)
# For Windows:
.\tauri-dev.bat

# For Linux/Mac:
npm run tauri dev
```

## 5. Building for Production

To build a standalone executable/installer for your operating system:

```bash
# For Windows:
.\tauri-build.bat

# For Linux/Mac:
npm run tauri build
```
You can find the compiled installers and executables in `src-tauri/target/release/bundle/`.

## Post-Setup Configuration
Once the app boots successfully, open the **Settings** menu via the top header bar:
1. Ensure the paths to your extracted GameBase64 `Screenshots`, `Games`, `BoxArt`, `Video` and `Sid` folders are set correctly.
2. If you want to use the native emulator capability, select the absolute path to your `x64sc` (VICE) executable.
