# Architecture Review

This note records the first simplification pass from the v0.2 codebase.

## New Boundaries

### Steam detail view
- `src/components/themes/SteamLibraryLayout.tsx`
  - now acts as a thin container
- `src/components/themes/steam/useSteamDetailViewModel.ts`
  - owns extras loading, box-art resolution, tab state, selection state, controller registration, and status/fullscreen-extra state
- `src/components/themes/steam/*`
  - own top bar, hero, tab bar, gallery panel, extras panels, sidebar, and fullscreen-extra modal

### BigBox
- `src/hooks/useBigBoxLibraryData.ts`
  - owns genre loading, recent/favorites/classics fetching, alphabet rail creation, and lazy rail loading
- `src/hooks/useBigBoxNavigation.ts`
  - owns BigBox controller/keyboard navigation, header focus state, per-rail focus indices, and game/header actions
- `src/hooks/useBigBoxScrollSync.ts`
  - owns sticky-header scroll alignment, focused-tile visibility, and double-Esc exit handling
- `src/components/bigbox/BigBoxHeader.tsx`
  - owns BigBox header rows and jump controls
- `src/components/bigbox/BigBoxAlphabetRail.tsx`
  - owns alphabet rail tile rendering
- `src/components/bigbox/BigBoxFooter.tsx`
  - owns the controller hint/footer bar

### Library shell
- `src/hooks/useLibraryBrowserState.ts`
  - owns library data/query state, search debounce, focused item restoration, recent shelf restoration, selection persistence, and Tiger Heli shortcut handling
- `src/hooks/useLibraryShellInput.ts`
  - owns controller, keyboard, wheel, and resize handling for the non-BigBox library shell
- `src/components/library/LibraryHeader.tsx`
  - owns the non-BigBox library header and primary shell actions
- `src/components/library/RecentlyPlayedShelf.tsx`
  - owns the recent shelf rendering and hover/focus presentation

### Settings
- `src/components/SettingsModal.tsx`
  - now acts as a smaller settings shell with shared draft state, navigation, and persistence
- `src/components/settings/*`
  - own extracted tab bodies for appearance, content, paths, scrapers, maintenance, and about/credits
- `src/components/settings/types.ts`
  - owns tab metadata, editable settings shape, and content item counts used by controller navigation

### Shared logic
- `src/lib/game-display.ts`
  - shared publisher/developer fallback handling
- `src/lib/steam-extras.ts`
  - shared extra-path, launch-label, and type-detection helpers
- `src/lib/library-navigation.ts`
  - shared letter-jump and grid/list focus movement logic across controller, keyboard, and wheel input

## Coverage Gates
- Frontend coverage threshold is configured in `vitest.config.mts`
- Targeted reviewed frontend utility modules are enforced at `80%`
- Package scripts now include:
  - `test:frontend`
  - `test:backend`
  - `test:e2e`
  - `coverage:frontend`
  - `coverage:backend`

## Remaining Hotspots
- `src-tauri/src/commands/db.rs`
  - query building is now split through `GameQueryBuilder` and row mapping is isolated
  - explicit SQLite support indexes are now created during CSV import and repaired automatically at runtime for older DBs
  - the cover lookup was moved out of the per-request grouped `Extras` subquery into a persisted `GameCoverIndex` table
  - measured on a copied real GB64 dataset, the first-page browse query first dropped from roughly `103 ms` to `73 ms`, then to roughly `0.7 ms` after splitting ordered ID fetch from detail row hydration
  - FTS5-backed `GameSearchIndex` is now in place for title/publisher/developer/musician/programmer/artist search
  - measured on a copied real GB64 dataset, search dropped from roughly `115-123 ms` with `LIKE` filters to roughly `0.06-0.19 ms` with FTS
  - the wide-row temp sort is gone from the hot path; the remaining backend work is optional further simplification of duplicated `GameView`/`Games` join logic
