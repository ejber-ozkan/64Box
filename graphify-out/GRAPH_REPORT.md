# Graph Report - VIC40GameBase64  (2026-06-15)

## Corpus Check
- 114 files · ~59,228 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 946 nodes · 1940 edges · 65 communities (57 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a19d6cd4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Detail View Layout & Navigation|Detail View Layout & Navigation]]
- [[_COMMUNITY_Core Architecture & Requirements|Core Architecture & Requirements]]
- [[_COMMUNITY_AI Agent Workflows & Task Tracking|AI Agent Workflows & Task Tracking]]
- [[_COMMUNITY_WASM Emulator Core & Localization|WASM Emulator Core & Localization]]
- [[_COMMUNITY_Database & Performance Paradigms|Database & Performance Paradigms]]
- [[_COMMUNITY_Media Extras & Asset Structuring|Media Extras & Asset Structuring]]
- [[_COMMUNITY_Component 6|Component 6]]
- [[_COMMUNITY_Component 7|Component 7]]
- [[_COMMUNITY_Component 8|Component 8]]
- [[_COMMUNITY_Component 9|Component 9]]
- [[_COMMUNITY_Component 10|Component 10]]
- [[_COMMUNITY_Component 11|Component 11]]
- [[_COMMUNITY_Component 12|Component 12]]
- [[_COMMUNITY_Component 13|Component 13]]
- [[_COMMUNITY_Component 14|Component 14]]
- [[_COMMUNITY_Component 15|Component 15]]
- [[_COMMUNITY_Component 16|Component 16]]
- [[_COMMUNITY_Component 17|Component 17]]
- [[_COMMUNITY_Component 18|Component 18]]
- [[_COMMUNITY_Component 19|Component 19]]
- [[_COMMUNITY_Component 20|Component 20]]
- [[_COMMUNITY_Component 21|Component 21]]
- [[_COMMUNITY_Component 22|Component 22]]
- [[_COMMUNITY_Component 23|Component 23]]
- [[_COMMUNITY_Component 24|Component 24]]
- [[_COMMUNITY_Component 25|Component 25]]
- [[_COMMUNITY_Component 26|Component 26]]
- [[_COMMUNITY_Component 27|Component 27]]
- [[_COMMUNITY_Component 28|Component 28]]
- [[_COMMUNITY_Component 29|Component 29]]
- [[_COMMUNITY_Component 30|Component 30]]
- [[_COMMUNITY_Component 31|Component 31]]
- [[_COMMUNITY_Component 32|Component 32]]
- [[_COMMUNITY_Component 33|Component 33]]
- [[_COMMUNITY_Component 34|Component 34]]
- [[_COMMUNITY_Component 35|Component 35]]
- [[_COMMUNITY_Component 36|Component 36]]
- [[_COMMUNITY_Component 37|Component 37]]
- [[_COMMUNITY_Component 38|Component 38]]
- [[_COMMUNITY_Component 39|Component 39]]
- [[_COMMUNITY_Component 40|Component 40]]
- [[_COMMUNITY_Component 41|Component 41]]
- [[_COMMUNITY_Component 42|Component 42]]
- [[_COMMUNITY_Component 43|Component 43]]
- [[_COMMUNITY_Component 44|Component 44]]
- [[_COMMUNITY_Component 45|Component 45]]
- [[_COMMUNITY_Component 61|Component 61]]
- [[_COMMUNITY_Component 67|Component 67]]
- [[_COMMUNITY_Component 73|Component 73]]
- [[_COMMUNITY_Component 80|Component 80]]
- [[_COMMUNITY_Component 81|Component 81]]
- [[_COMMUNITY_Component 83|Component 83]]
- [[_COMMUNITY_Component 91|Component 91]]
- [[_COMMUNITY_Component 96|Component 96]]
- [[_COMMUNITY_Component 109|Component 109]]
- [[_COMMUNITY_Component 128|Component 128]]
- [[_COMMUNITY_Component 142|Component 142]]
- [[_COMMUNITY_Component 150|Component 150]]

## God Nodes (most connected - your core abstractions)
1. `Game` - 37 edges
2. `String` - 32 edges
3. `Result` - 29 edges
4. `useSettings()` - 29 edges
5. `isTauri()` - 25 edges
6. `useGamepad()` - 21 edges
7. `scripts` - 19 edges
8. `import_csv_directory_to_sqlite()` - 18 edges
9. `invoke()` - 18 edges
10. `launch_emulator()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Claude Agent Instructions` --references--> `Beads Issue Tracker`  [EXTRACTED]
  CLAUDE.md → AGENTS.md
- `Tauri Bridge API` --references--> `Tauri Desktop Wrapper Requirements`  [INFERRED]
  docs/architecture-review.md → GB64_Modern_Frontend_Requirements.md
- `WASM Emulator Iframe` --implements--> `WASM Emulation Requirements`  [INFERRED]
  public/emulator.html → GB64_Modern_Frontend_Requirements.md
- `Summary/Detail Payload Paradigm` --references--> `SQLite Database Requirements`  [INFERRED]
  docs/architecture-review.md → GB64_Modern_Frontend_Requirements.md
- `jsSID Player Test` --implements--> `SID Player Requirements`  [INFERRED]
  public/test.html → GB64_Modern_Frontend_Requirements.md

## Import Cycles
- 1-file cycle: `src-tauri/src/commands/db/games.rs -> src-tauri/src/commands/db/games.rs`
- 1-file cycle: `src-tauri/src/commands/db/querying.rs -> src-tauri/src/commands/db/querying.rs`
- 1-file cycle: `src-tauri/src/commands/emulator.rs -> src-tauri/src/commands/emulator.rs`
- 1-file cycle: `src-tauri/src/commands/files.rs -> src-tauri/src/commands/files.rs`
- 1-file cycle: `src-tauri/src/database.rs -> src-tauri/src/database.rs`

## Hyperedges (group relationships)
- **Beads Issue Tracking and Git Workflow** — agents_beads_issue_tracker, agents_session_completion_workflow, claude_agent_instructions [EXTRACTED 1.00]
- **Offline C64 WASM Emulation Flow** — gb64_modern_frontend_requirements_wasm_emulation, public_emulator_wasm_iframe, cores_readme_emulatorjs_core [EXTRACTED 1.00]

## Communities (65 total, 8 thin omitted)

### Community 0 - "Detail View Layout & Navigation"
Cohesion: 0.15
Nodes (14): DetailViewProps, ListView(), ListViewProps, ScrapeButtonProps, mockGames, getDbGameDetail(), getGameExtras(), WindowGameListSection() (+6 more)

### Community 1 - "Core Architecture & Requirements"
Cohesion: 0.17
Nodes (12): EmulatorJS vice_x64 Core, Summary/Detail Payload Paradigm, Tauri Bridge API, Project 64Box Requirements, SID Player Requirements, SQLite Database Requirements, Tauri Desktop Wrapper Requirements, WASM Emulation Requirements (+4 more)

### Community 2 - "AI Agent Workflows & Task Tracking"
Cohesion: 0.18
Nodes (10): Agent Instructions, Beads Issue Tracker, Codebase Navigation with Graphify, Non-Interactive Shell Commands, Quick Reference, Quick Reference, Rules, Session Completion (+2 more)

### Community 3 - "WASM Emulator Core & Localization"
Cohesion: 0.07
Nodes (45): build_game_detail_query(), build_game_summary_query(), get_db_game_count(), get_db_games(), get_game_detail(), get_game_extras(), get_genres(), get_sub_genres() (+37 more)

### Community 4 - "Database & Performance Paradigms"
Cohesion: 0.10
Nodes (62): get_database_bootstrap_status(), import_database_from_mdb(), open_mdb_file_dialog(), DatabaseBootstrapStatus, R, cleanup_export_directory(), configure_runtime_db_path(), create_export_directory() (+54 more)

### Community 5 - "Media Extras & Asset Structuring"
Cohesion: 0.19
Nodes (15): ExtrasBigscreenNavigation, ExtrasDetailProps, ImageWithFallback(), ImageWithFallbackProps, AUDIO_EXTENSIONS, isAudioExtra(), isVideoExtra(), ResolvedExtraMedia() (+7 more)

### Community 6 - "Component 6"
Cohesion: 0.17
Nodes (14): metadata, ERROR_SOUNDS, UiSoundRuntime(), SettingsProvider(), areMenuSoundEffectsEnabled(), audioCache, canPlayUiSoundEffects(), getAudioElement() (+6 more)

### Community 7 - "Component 7"
Cohesion: 0.05
Nodes (49): BigBoxAlphabetRail(), BigBoxAlphabetRailProps, BigBoxFooter(), BigBoxFooterProps, BigBoxHeader(), BigBoxHeaderProps, BigBoxTileMedia(), BigBoxView() (+41 more)

### Community 8 - "Component 8"
Cohesion: 0.14
Nodes (29): download_media_asset(), find_all_media_variants(), read_file_bytes(), resolve_media_child_path(), resolve_media_path(), sanitize_relative_media_path(), scan_rom_directory(), split_variant_stem() (+21 more)

### Community 9 - "Component 9"
Cohesion: 0.15
Nodes (14): LibraryApp(), AlphabetJumpBar(), AlphabetJumpBarProps, LETTERS, AppLaunchSplash(), BigBoxSessionState, GridView(), GridViewProps (+6 more)

### Community 10 - "Component 10"
Cohesion: 0.19
Nodes (22): copy_test_emulator(), create_launch_temp_dir(), launch_emulator(), require_existing_file(), system_shell_executable(), test_launch_emulator_directory_and_non_zip_success(), test_launch_emulator_invalid_zip(), test_launch_emulator_non_existent() (+14 more)

### Community 11 - "Component 11"
Cohesion: 0.08
Nodes (23): 1. Prerequisites, 2. Setting up the Database and Assets, 3. Building the SQLite Database, 4. Running the Application in Development, 5. Building for Production, 64Box, 6. Skills used to build this, BigBox Letter Jump (+15 more)

### Community 12 - "Component 12"
Cohesion: 0.19
Nodes (19): exit_app(), get_window_size(), open_directory_dialog(), open_file_dialog(), open_path_with_system_default(), set_window_mode(), test_validate_open_path_rejects_data_url(), test_validate_open_path_rejects_ftp_url() (+11 more)

### Community 13 - "Component 13"
Cohesion: 0.17
Nodes (13): DETAIL_CONFIG, DetailFullscreenMedia, DetailFullscreenRequest, DetailView(), SettingsView(), WasmPlayer(), WasmPlayerProps, DetailNavProps (+5 more)

### Community 14 - "Component 14"
Cohesion: 0.12
Nodes (17): createPerformanceIndexes(), csvFiles, Database, db, dbPath, fs, getArgValue(), outputDir (+9 more)

### Community 15 - "Component 15"
Cohesion: 0.21
Nodes (19): get_secure_setting(), save_secure_setting(), decrypt_legacy_value(), decrypt_value(), encrypt_value(), encrypt_value_with_legacy_fixed_iv(), get_encryption_key(), test_decrypt_supports_legacy_fixed_iv_ciphertext() (+11 more)

### Community 16 - "Component 16"
Cohesion: 0.10
Nodes (20): app, security, windows, enable, scope, build, beforeBuildCommand, beforeDevCommand (+12 more)

### Community 17 - "Component 17"
Cohesion: 0.17
Nodes (12): ExtrasDetail(), ImageSlider(), ImageSliderProps, MusicianPhoto(), MusicianPhotoProps, defaultSettings, SECURE_FIELDS, SettingsContext (+4 more)

### Community 18 - "Component 18"
Cohesion: 0.10
Nodes (20): devDependencies, better-sqlite3, csv-parse, eslint, eslint-config-next, happy-dom, jsdom, @playwright/test (+12 more)

### Community 19 - "Component 19"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 20 - "Component 20"
Cohesion: 0.11
Nodes (19): scripts, build, coverage:backend, coverage:frontend, db:audit, db:convert, db:import, dev (+11 more)

### Community 21 - "Component 21"
Cohesion: 0.28
Nodes (16): get_db_game_count(), get_db_games(), get_game_detail(), get_game_extras(), get_genres(), get_secure_setting(), get_sub_genres(), save_secure_setting() (+8 more)

### Community 22 - "Component 22"
Cohesion: 0.33
Nodes (5): SidPlayer(), SidPlayerProps, SidPlayerRuntime, SidRuntimeConstructor, Window

### Community 23 - "Component 23"
Cohesion: 0.14
Nodes (13): DetailLayoutProps, Props, StatusRow(), DetailGameTitle(), DetailGameTitleProps, OUTLINED_TITLE_STYLE, DetailTitleBanner(), DetailTitleBannerProps (+5 more)

### Community 24 - "Component 24"
Cohesion: 0.16
Nodes (12): BigBoxExitPrompt(), BigBoxExitPromptProps, ExitPromptFocus, SubGenrePickerModal(), SubGenrePickerModalProps, GamepadButtonMap, GamepadHandlers, lastAxes (+4 more)

### Community 25 - "Component 25"
Cohesion: 0.24
Nodes (15): confirmProceed(), fs, getArgValue(), hasFlag(), main(), path, prompt(), readline (+7 more)

### Community 27 - "Component 27"
Cohesion: 0.23
Nodes (11): BigBoxViewProps, Settings, UseBigBoxLibraryDataProps, LibraryViewMode, UseLibraryShellInputProps, UseWindowLibraryShelvesProps, GameFilters, LibraryHeader() (+3 more)

### Community 28 - "Component 28"
Cohesion: 0.30
Nodes (13): DatabaseBootstrapStatus, DatabaseImportResult, ExtraRow, GameDetailRow, GameFilters, GameRow, LaunchRequest, LaunchResult (+5 more)

### Community 29 - "Component 29"
Cohesion: 0.21
Nodes (11): ensureFfmpegAvailable(), ensureOutputDir(), fs, getInputFiles(), INPUT_DIR, main(), OUTPUT_DIR, path (+3 more)

### Community 30 - "Component 30"
Cohesion: 0.17
Nodes (12): dependencies, @emulatorjs/core-vice_x64, @emulatorjs/core-vice_x64sc, @emulatorjs/emulatorjs, next, react, react-dom, @tauri-apps/api (+4 more)

### Community 31 - "Component 31"
Cohesion: 0.20
Nodes (9): Architecture Overview, Beads Issue Tracker, Build & Test, Conventions & Patterns, graphify, Project Instructions for AI Agents, Quick Reference, Rules (+1 more)

### Community 32 - "Component 32"
Cohesion: 0.20
Nodes (9): 64Box Architecture Review, Backend Tauri Application (Rust), Bridge API Payloads, Database Abstraction, Detailed Modals & Dependency Injection (`DetailView.tsx`), Frontend UI Architecture, Math-based Focus Navigation, Overview (+1 more)

### Community 33 - "Component 33"
Cohesion: 0.25
Nodes (6): FOLDERS, fs, NODE_MODULES, path, PUBLIC_EMU, ROOT

### Community 34 - "Component 34"
Cohesion: 0.29
Nodes (6): csvFile, fileContent, fs, { parse }, path, records

### Community 35 - "Component 35"
Cohesion: 0.23
Nodes (8): ControllerSearchKeyboard(), ControllerSearchKeyboardProps, KEYBOARD_ROWS, KeyboardAction, KeyboardKey, VisualExtrasBrowser(), POPUP_SOUNDS, usePopupOpenSound()

### Community 36 - "Component 36"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 37 - "Component 37"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 44 - "Component 44"
Cohesion: 0.32
Nodes (5): LETTER_RAIL_CACHE, getDbGameCount(), getDbGames(), getGenres(), getSubGenres()

### Community 61 - "Component 61"
Cohesion: 0.29
Nodes (8): COVER_ART_URL_CACHE, getResolvedCoverArtUrl(), ResolvedBoxArtGame, useResolvedBoxArtUrl(), getAssetUrl(), resolveMediaPath(), mediaZoneFor(), WindowedDetailLayout()

### Community 67 - "Component 67"
Cohesion: 0.47
Nodes (4): EmuMoviesSearchResult, getVideoSnapUrl(), loginEmuMovies(), searchEmuMovies()

### Community 73 - "Component 73"
Cohesion: 0.16
Nodes (15): DOC_EXT, DOC_FOLDERS, GAME_EXT, GAME_FOLDERS, getExtraExtension(), getExtraLaunchLabel(), getExtraSourceLabel(), groupExtras() (+7 more)

### Community 80 - "Component 80"
Cohesion: 0.12
Nodes (18): cleanMetadataValue(), getNeonArchiveDetailStyle(), NEON_ARCHIVE_DETAIL_STYLES, NeonArchiveDetailStyle, buildPersonnel(), buildVersions(), clampTextLines(), formatVersionLabel() (+10 more)

### Community 81 - "Component 81"
Cohesion: 0.67
Nodes (3): getGameStudios(), getPrimaryStudioLabel(), UNKNOWN_VALUES

### Community 83 - "Component 83"
Cohesion: 0.24
Nodes (10): LETTERS, getLibraryColumnCount(), getNextLetterJump(), HorizontalDirection, LibraryViewMode, moveLibraryFocusHorizontally(), moveLibraryFocusVertically(), resolveFocusedGame() (+2 more)

### Community 91 - "Component 91"
Cohesion: 0.22
Nodes (7): ScreenScraperApiResponse, ScreenScraperGameResponse, ScreenScraperLocalizedName, ScreenScraperMedia, ScreenScraperMediaResponse, ScreenScraperResult, ScreenScraperSynopsis

### Community 96 - "Component 96"
Cohesion: 0.15
Nodes (28): DatabaseBootstrapStatus, DatabaseImportResult, downloadMediaAsset(), exitApp(), findAllMediaVariants(), getDatabaseBootstrapStatus(), getSecureSetting(), getWindowSize() (+20 more)

### Community 109 - "Component 109"
Cohesion: 0.29
Nodes (5): BigBoxTileMediaProps, COVER_CACHE, getCoverUrl(), SCREENSHOT_CACHE, getMediaUrl()

### Community 128 - "Component 128"
Cohesion: 0.33
Nodes (4): TheGamesDBGameLookupResponse, TheGamesDBImage, TheGamesDBImageLookupResponse, TheGamesDBResult

### Community 142 - "Component 142"
Cohesion: 0.12
Nodes (25): DirectoryField, FileField, HeaderZone, SettingsViewProps, AboutSettingsTab(), AboutSettingsTabProps, AppearanceSettingsTab(), AppearanceSettingsTabProps (+17 more)

### Community 150 - "Component 150"
Cohesion: 0.33
Nodes (4): DetailNavigationHook, PlayButton(), PlayButtonProps, PlayLaunchTarget

## Knowledge Gaps
- **311 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+306 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_db_path()` connect `Database & Performance Paradigms` to `Component 10`, `WASM Emulator Core & Localization`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `open_db_connection()` connect `WASM Emulator Core & Localization` to `Database & Performance Paradigms`, `Component 15`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `Game` connect `Detail View Layout & Navigation` to `Media Extras & Asset Structuring`, `Component 7`, `Component 9`, `Component 44`, `Component 13`, `Component 109`, `Component 80`, `Component 81`, `Component 17`, `Component 83`, `Component 150`, `Component 23`, `Component 27`, `Component 61`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _312 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `WASM Emulator Core & Localization` be split into smaller, more focused modules?**
  _Cohesion score 0.07374890254609306 - nodes in this community are weakly interconnected._
- **Should `Database & Performance Paradigms` be split into smaller, more focused modules?**
  _Cohesion score 0.10221619176843058 - nodes in this community are weakly interconnected._
- **Should `Component 7` be split into smaller, more focused modules?**
  _Cohesion score 0.05325140809011777 - nodes in this community are weakly interconnected._