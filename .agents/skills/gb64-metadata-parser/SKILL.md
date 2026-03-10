name: gb64-metadata-parser
description: Use this skill when writing scripts to ingest, parse, and sanitize the legacy Gamebase64 (GB64) database exports into clean JSON or SQLite for the 64Box frontend.

Gamebase64 Data Ingestion & Sanitization

When to Use This Skill

When reading the raw Gamebase64 database exports (CSV/Access/SQLite).

When designing the modern SQLite database schema or JSON data structures for 64Box.

When writing data sanitization and transformation utility functions.

1. Legacy Data Sanitization Rules (Strict)

The original Gamebase64 database was built over decades using legacy tools (like MS Access) in the 90s and 00s. You must strictly apply these sanitization rules during ingestion:

Text Encoding: Assume raw text might be in Windows-1252 or ISO-8859-1. You must ensure all strings are correctly decoded and saved as strict UTF-8.

Null Values/Unknowns: Legacy databases often use empty strings "", a single space " ", ?, or the words (Unknown) / (None) to represent missing data. Additionally, Years.csv uses values like 9999 for unknown years. All of these must be converted to a strict programming null in JSON or NULL in SQLite.

Boolean Normalization: Watch out for inconsistent boolean flags. Standardize all of these into strict boolean types (true or false).

String Trimming: Always .trim() strings. It is common to find trailing spaces in legacy fixed-width or Access exports.

Array Parsing: Sometimes multiple values are stuffed into a single slash-separated string (e.g., English / German). Split these into proper string arrays where applicable.

2. GB64 Core Schema Mapping

The GB64 database relies on a strict XX_Id foreign key naming convention. Games.csv acts as the central hub.

Main Games Table (Games.csv)

Original Field

Expected Clean Type

Description / Handling Notes

GA_Id

Integer (PK)

Primary Key. The unique identifier for the game.

Name

String

Game Title. (e.g., "$100,000 Pyramid, The" -> Consider a script to flip "The" to the front for display, but keep original for sorting).

Filename / FileToRun

String

Path to the ROM file (.zip, .d64, etc.). Needs sanitization for cross-platform file paths.

ScrnshotFilename

String

Path to the default screenshot.

SidFilename

String

Path to the .sid music file for the embedded player.

CRC

String

Crucial for the auto-scanner. Used to match local ROMs.

V_PalNTSC

Enum (0/1/2)

Video standard. Needs mapping to human-readable strings (PAL, NTSC, Both).

V_TrueDriveEmu

Boolean

Crucial for emulator arguments. If true or 1, VICE needs the -true-drive-emulation flag.

Classic

Boolean

Denotes if the game is considered a GB64 Classic (often represented as -1 in legacy Access DBs).

Direct Relational Tables (Foreign Keys in Games.csv)

When processing the data, the parser must resolve these foreign keys into nested objects (for JSON) or maintain strict SQLite Foreign Key constraints:

AR_Id -> Artists.csv: Resolves the graphic artist.

CR_Id -> Crackers.csv: Resolves the release group/cracker.

DE_Id -> Developers.csv: Resolves the developer.

DI_Id -> Difficulty.csv: Resolves the difficulty rating.

GE_Id -> Genres.csv: Resolves the sub-genre. (See Secondary Relations below).

LA_Id -> Languages.csv: Resolves the supported language(s). Parse slash-separated values into arrays.

LI_Id -> Licenses.csv: Resolves the software license type (Commercial, PD/Freeware, etc.).

YE_Id -> Years.csv: Resolves the release year. Values > 9000 (like 9991, 9999) should be parsed as null.

MU_Id -> Musicians.csv: Resolves the musician. Important: Include the Photo field to map composer portraits in the UI.

PU_Id -> Publishers.csv: Resolves the publishing company.

PR_Id -> Programmers.csv: Resolves the main programmer.

RA_Id -> Rarities.csv: Resolves game rarity (e.g., "Common as mud", "Extremely Rare").

Secondary Relational Tables

PG_Id (inside Genres.csv) -> PGenres.csv: Resolves the high-level Parent Genre (e.g., Arcade, Sports). The final game object should have both ParentGenre and SubGenre available for frontend filtering.

1-to-Many Tables (Arrays in JSON)

Extras.csv (Mapped by GA_Id): Contains paths for Box Art, Manuals, Maps, and Magazine covers. Nest as an array of objects inside the main Game object, sorted by DisplayOrder.

Music.csv (Mapped by GA_Id): Contains extra standalone .sid tracks or alternate music files. Nest as an array of playable tracks.

Smart Playlists / Views

ViewData.csv & ViewFilters.csv: These tables define pre-built dynamic collections (e.g., "Original Disks", "Classics", "Bugged Games"). The parser should convert these into a structured JSON configuration file that the frontend uses to automatically generate sidebar "Smart Playlists".

3. Output Format

Web/JSON (Phase 1): The output should be an array of highly nested, clean JSON objects. Relational data (like Developer name, Parent Genre, Musician Photo) should be included directly in the Game object to prevent the frontend from doing heavy JOINs on the client.

Desktop/Tauri (Phase 3): The output should be a well-indexed SQLite database file to ensure sub-millisecond query times for 30,000+ rows. Create indexes on Name, CRC, GE_Id (Genre), PG_Id (Parent Genre), and YE_Id (Year).