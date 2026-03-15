# Changelog

All notable changes to this project will be documented in this file.

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
