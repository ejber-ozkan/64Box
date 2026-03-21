# Changelog

All notable changes to this project will be documented in this file.

## [0.5] - 2026-03-21

### Added
- Added contextual sub-genre filtering to both windowed browsing and BigBox, including database queries for distinct sub-genres and filtered result counts.
- Added shared detail-title banner artwork so available cover or box art can fill the top hero area across all single-game themes.
- Added a reusable `More...` sub-genre picker for cases where a selected genre has too many sub-genres to fit comfortably in one header row.
- Added a BigBox `LT` controller shortcut and footer hint so players can jump back to the top menu from anywhere in the library.

### Changed
- Reworked detail headers to prefer stretched banner artwork with stronger readability treatment for overlaid title text.
- Updated BigBox and windowed browsing so active search or genre filters surface `GAMES FOUND` counts instead of the unfiltered library total.
- Refined README feature wording to better describe fullscreen mode, enhanced search, and the import/setup flow.
- Updated surfaced app versioning to `0.5.0`.

### Fixed
- Fixed BigBox/controller navigation friction when large sub-genre sets overflow the header by routing the full list through a dedicated picker.
- Fixed repeated state-update loops in BigBox data loading and input-mode handling that could trigger `Maximum update depth exceeded` console errors.
- Fixed gamepad hook lint/runtime hygiene by moving handler ref synchronization out of render and adding the missing left-trigger mapping.

## [0.4] - 2026-03-20

### Added
- Added a packaged first-run database setup flow so shipped builds can prompt for `GBC_v19.mdb`, export it, build SQLite, and continue into the app without a developer-only import step.
- Added GitHub Actions release automation for Linux and macOS tag builds while keeping Windows release bundling available as a local/manual path to save private Actions minutes.
- Added more aggressive BigBox performance controls for rapid letter jumping, including delayed alphabet rail loading, rail caching, and deferred tile media mounting.

### Changed
- Moved the public release workflow to local Windows bundling plus GitHub-hosted Linux/macOS release builds.
- Reworked windowed browsing to better match BigBox with branded header treatment, recent/favorites/classics sections, and cleaner list-mode separation.
- Split responsive windowed detail layouts from fullscreen detail layouts so fullscreen theme changes no longer spill into window mode.
- Improved Steam fullscreen extras gallery behavior with capped internal scrolling, left/right fullscreen image browsing, and contained artwork previews.
- Updated surfaced app versioning to `0.4.0`.

### Fixed
- Fixed BigBox horizontal rail looping so wraparound on classics/recent/favorites rails no longer loses the focus ring or resets rail focus unexpectedly.
- Fixed BigBox grid scrolling so long alphabet sections keep the focused tile in a more visible middle band.
- Fixed multiple BigBox return-state issues when backing out of detail views so search, filters, rail position, and focused game are preserved more reliably.
- Fixed fullscreen detail extras-gallery navigation so the highlighted item scrolls inside the gallery box and exits the region more naturally.
- Fixed Steam/fullscreen extras artwork cropping by switching gallery cards to contained previews and resizing the gallery viewport to full visible rows.

## [0.3] - 2026-03-15

### Added
- Added a controller search keyboard overlay for BigBox fullscreen search, with live filtering and `B` to close without clearing the current query.
- Added fullscreen BigBox UI sound effects, including launch, navigation, search/filter, detail-open, popup, view-switch, and rotating close cues.
- Added a startup splash overlay using `c64days-wallpaper.png` and the `64Box` marque, shown on both windowed and BigBox launch.
- Added shared detail-title rendering so all single-game themes now show trophy flanks around the game title.

### Changed
- Reworked windowed library mode to better match BigBox browsing, including branded header treatment, genre chips under search, and dedicated recent/favorites/classics shelves.
- Split windowed single-game detail into responsive layouts across all themes, while keeping fullscreen/BigBox detail behavior separate.
- Refined BigBox fullscreen exit handling so controller `B` opens a confirmation dialog, optionally persists “don’t ask again”, and waits for the close cue before quitting.
- Updated surfaced app versioning to `0.3.0`.

### Fixed
- Fixed popup open sounds so conditionally mounted dialogs like the BigBox exit prompt now correctly play rotating popup audio on first open.
- Fixed missing trophy styling on detail titles across fullscreen and windowed themes.
- Fixed several windowed-library inconsistencies, including list-mode shelf separation, settings-button labeling, and window-only rail behavior.

## [0.2] - 2026-03-14

### Added
- Split major frontend hotspots into focused hooks and subcomponents for BigBox, Steam detail, settings, and the library shell.
- Added architecture review notes documenting new component and hook boundaries.
- Added explicit SQLite support indexes, persisted `GameCoverIndex`, and FTS5-backed `GameSearchIndex`.
- Added backend fallback so older databases without `GameSearchIndex` still search through the legacy `LIKE` path instead of failing.
- Added frontend and backend tests for new navigation, helper, and database support logic.

### Changed
- Reworked game list loading to fetch ordered IDs first and hydrate detail rows separately, removing wide-row sorting from the hot path.
- Updated the database import flow so fresh MDB/CSV imports create indexes, cover lookup, and FTS support objects automatically.
- Updated runtime DB initialization so older local databases self-heal support tables and indexes on app startup.
- Normalized surfaced app versioning to `0.2.0`.
- Expanded Windows setup docs with the official Microsoft Access Database Engine download link.

### Fixed
- Fixed search failures on older local databases where `GameSearchIndex` was missing.
- Fixed remaining database hot paths around cover lookup and search latency.
- Fixed root local backup file handling by ignoring `gb64.sqlite.bk`.

## [0.1] - 2026-03-14

### Added
- BigBox-style fullscreen browsing mode with larger rails and favorites integration.
- Cover-first media flow for tiles and detail pages.
- Favorites toggling via controller `Y` and keyboard `F` across library, BigBox, and detail views.
- README screenshots, shortcut documentation, and GB64 attribution.
- Settings `About & Credits` updates, including GB64 acknowledgement and Tiger Heli shortcut.

### Changed
- Reworked single-game detail navigation for controller and keyboard.
- Split detail extras into launchable variants and separate gallery media tabs.
- Improved Steam-style detail layout, play button positioning, and media presentation.
- Expanded search to include graphics and additional credit metadata.
- Updated rail subtitle fallback to prefer publisher, then developer, then `Unknown`.

### Fixed
- BigBox rail alignment and section jump positioning.
- Up/down traversal between letter sections and rails.
- Fullscreen media sizing for tall covers and extra artwork.
- Main game launch fallback for titles with missing `gameFilename` but valid primary ROM paths.
