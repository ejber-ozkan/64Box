# Changelog

All notable changes to this project will be documented in this file.

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
