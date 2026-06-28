# 64Box Architecture Review

This document provides a high-level review of the newly optimized architecture built into `64Box`, completed during the Phase 5 Cleanup & Consolidation process.

## Frontend UI Architecture

### Overview
64Box is built as a single-page React frontend hosted locally by Tauri. Rendering complexities inherent to extremely large retro-libraries have been resolved through modular dependency injection, view lazy-loading, and mathematical bounding models instead of heavy derived states.

### Platform-Scoped Library Context
The multi-platform work keeps the existing library shell rather than cloning the app per system. `SettingsContext.tsx` owns the active platform, last-used platform, platform import state, folder roots, emulator profiles, favorites, recently played items, and navigation state. Browser/dev mode reads platform import status from the stored platform settings when present, which lets E2E tests exercise imported Atari 800 settings without pretending to run inside Tauri.

The top-level page routes unimported platforms to `DatabaseSetupView` and otherwise passes the active platform through the shared browse/search/detail hooks. Settings tabs are generated from imported platform status, so users see concrete pages such as `C64 Platform Paths` and `Atari 800 Platform Paths` instead of one global Local Paths page. This keeps C64 compatibility intact while allowing Atari 800-specific folders, RetroArch Atari800 core settings, and Altirra settings to live beside C64 paths without overwriting them.

### Detailed Modals & Dependency Injection (`DetailView.tsx`)
Rather than pulling exhaustive data into the global `BigBoxView` or `LibraryBrowserState` grids, 64Box utilizes a Summary/Detail payload paradigm:
- **Summary Payload**: Main library queries return lightweight `Game` configurations containing basic identifiers and metadata.
- **Eager Injection**: The moment a user selects a game, the orchestrating `DetailView.tsx` component is instantiated with the Summary `Game`.
- **Detail Overlay**: Inside `DetailView`, the un-fetched properties (musician specifics, loading mechanics) are eagerly resolved via `getDbGameDetail` via the Tauri bridge. It then safely destructures and merges the properties vertically to its children (ConsoleHeroLayout, SteamLayout, NeonArchiveLayout, etc.). 

### Math-based Focus Navigation
In fullscreen mode (`BigBoxView`), the app uses coordinate-mapping logic for d-pad/keyboard movements. By lifting the state out of massive `switch` trees, `navigation-math.ts` accurately maps `calculateUpNavigation`, `calculateRightNavigation`, etc., cleanly into a scalable React hook (`useBigBoxNavigation`).

### UI Component Isolation
Visual features such as deep `Extras` exploration have been cleanly extracted. `ExtrasDetail.tsx` manages high-order routing, delegating rendering paths to `ResolvedExtraMedia.tsx` or `VisualExtrasBrowser.tsx`, drastically reducing memory leaks tied to over-mounting heavy canvas nodes.

---

## Backend Tauri Application (Rust)

### Database Abstraction
The heavy operations regarding the SQLite `GameView` operations have been stripped back into logical query-builder components within `src-tauri/src/commands/db/`:
- `querying.rs`: Safe, composable traits and methods for appending FTS triggers, GLOB checks, filters, and SQL injection protections cleanly before query finalization.
- `games.rs`: Handles the pure object mappings specifically for Summary `GameRow` constructs and `GameDetailRow` deep metadata structures.

Platform-scoped imports now merge each platform into the active SQLite library instead of replacing the whole database. Support objects such as `PlatformLibraries`, `GameView`, `GameCoverIndex`, and `GameSearchIndex` carry platform identity so duplicate source game IDs or duplicate titles do not leak across C64 and Atari 800. Rust tests that mutate `VIC40_DB_PATH` share a process-wide guard to prevent parallel test threads from falling back to the production database.

### Launch and Media Boundaries
Launch behavior is capability-driven by platform. C64 retains VICE, RetroArch, SID playback, `.vfl`, and C64-compatible archive handling. Atari 800 adds RetroArch Atari800 core validation, Altirra executable validation, Atari-compatible launch extensions, `.m3u` handling for RetroArch multi-file launches, and `.sap` recognition for future Atari music playback. Media and music UI surfaces read platform capabilities so unsupported controls, such as SID playback on Atari 800, are hidden rather than presented as broken features.

### Bridge API Payloads
Between Rust and TypeScript environments, we no longer bloat JSON messaging. We use strict option `Option<String>` types natively to eliminate unhandled payload crashes on the JS side, maintaining fluid and robust type-bridges across both tech stacks.
