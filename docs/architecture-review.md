# 64Box Architecture Review

This document provides a high-level review of the newly optimized architecture built into `64Box`, completed during the Phase 5 Cleanup & Consolidation process.

## Frontend UI Architecture

### Overview
64Box is built as a single-page React frontend hosted locally by Tauri. Rendering complexities inherent to extremely large retro-libraries have been resolved through modular dependency injection, view lazy-loading, and mathematical bounding models instead of heavy derived states.

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

### Bridge API Payloads
Between Rust and TypeScript environments, we no longer bloat JSON messaging. We use strict option `Option<String>` types natively to eliminate unhandled payload crashes on the JS side, maintaining fluid and robust type-bridges across both tech stacks.
