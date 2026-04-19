---
name: gb64-metadata-parser
description: Use this skill when writing scripts to ingest, parse, and sanitize legacy GameBase64 exports into clean JSON or SQLite for 64Box.
version: 1.0.0
author: 64Box
tags: [gb64, metadata, sqlite, parsing, data-ingestion]
---

# GameBase64 Data Ingestion & Sanitization

## When to Use This Skill

- When reading raw GameBase64 database exports such as CSV, Access, or SQLite.
- When designing modern SQLite schemas or JSON data structures for 64Box.
- When writing data sanitization and transformation utilities.

## 1. Legacy Data Sanitization Rules

The original GameBase64 database was built over decades using legacy tools such as MS Access. Apply these rules during ingestion:

- Text encoding: Assume raw text may be Windows-1252 or ISO-8859-1. Decode and save as strict UTF-8.
- Null values and unknowns: Normalize empty strings, single spaces, `?`, `(Unknown)`, `(None)`, and sentinel year values like `9999` into `null` or `NULL`.
- Boolean normalization: Standardize inconsistent flags into strict booleans.
- String trimming: Always trim strings.
- Array parsing: Split slash-separated multi-value fields such as `English / German` where appropriate.

## 2. GB64 Core Schema Mapping

The GB64 database relies on a strict `XX_Id` foreign key naming convention. `Games.csv` is the central hub.

### Main Games Table (`Games.csv`)

- `GA_Id`: Integer primary key.
- `Name`: Game title.
- `Filename` / `FileToRun`: Path to the ROM file. Sanitize for cross-platform paths.
- `ScrnshotFilename`: Default screenshot path.
- `SidFilename`: SID music path.
- `CRC`: Used for auto-scanner matching.
- `V_PalNTSC`: Map to human-readable video standard values.
- `V_TrueDriveEmu`: Used for emulator launch flags.
- `Classic`: Normalize legacy truthy values into booleans.

### Direct Relational Tables

Resolve these foreign keys into nested objects for JSON, or preserve strict foreign keys in SQLite:

- `AR_Id` -> `Artists.csv`
- `CR_Id` -> `Crackers.csv`
- `DE_Id` -> `Developers.csv`
- `DI_Id` -> `Difficulty.csv`
- `GE_Id` -> `Genres.csv`
- `LA_Id` -> `Languages.csv`
- `LI_Id` -> `Licenses.csv`
- `YE_Id` -> `Years.csv`
- `MU_Id` -> `Musicians.csv`
- `PU_Id` -> `Publishers.csv`
- `PR_Id` -> `Programmers.csv`
- `RA_Id` -> `Rarities.csv`

### Secondary Relational Tables

- `PG_Id` inside `Genres.csv` -> `PGenres.csv`

Expose both parent and sub-genre for frontend filtering.

### One-to-Many Tables

- `Extras.csv` by `GA_Id`: nest as ordered arrays of box art, manuals, maps, and covers.
- `Music.csv` by `GA_Id`: nest as playable track arrays.

### Smart Playlists / Views

- `ViewData.csv` and `ViewFilters.csv`: convert into structured config the frontend can use for dynamic playlists.

## 3. Output Format

- Web / JSON: Produce nested, clean JSON objects so the frontend does not need heavy client-side joins.
- Desktop / Tauri: Produce a well-indexed SQLite database with indexes on `Name`, `CRC`, `GE_Id`, `PG_Id`, and `YE_Id`.
