"use client";

/**
 * tauri-bridge.ts
 *
 * Provides a safe, isomorphic wrapper around Tauri IPC commands.
 *
 * All functions in this file:
 *  - Return sensible mock/fallback values when running in a browser (dev mode).
 *  - Delegate to the real Rust command when running inside the Tauri desktop runtime.
 *
 * To add a new Rust command:
 *  1. Write the #[tauri::command] fn in src-tauri/src/lib.rs
 *  2. Register it in the invoke_handler![] list in lib.rs::run()
 *  3. Add a matching TypeScript wrapper here
 */

// ---------------------------------------------------------------------------
// Runtime detection
// ---------------------------------------------------------------------------
const isTauri = (): boolean =>
  typeof window !== 'undefined' && (
    (window as any).__TAURI_INTERNALS__ !== undefined || 
    (window as any).__TAURI_IPC__ !== undefined || 
    (window as any).__TAURI__ !== undefined
  );

async function invoke<T>(command: string, payload?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error(`[tauri-bridge] Not running in Tauri. Command "${command}" is unavailable.`);
  }
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(command, payload);
}

// ---------------------------------------------------------------------------
// Types that mirror the Rust structs in lib.rs
// ---------------------------------------------------------------------------
export interface ScannedRom {
  path: string;
  filename: string;
  extension: string;
  crc32: string;
  size_bytes: number;
}

export interface LaunchRequest {
  emulator_path: string;
  rom_path: string;
  true_drive_emulation: boolean;
  is_pal: boolean;
  game_id?: string;
  core_path?: string;
}

export interface LaunchResult {
  success: boolean;
  message: string;
}

export interface ResolvedPath {
  exists: boolean;
  absolute_path: string;
}

// ---------------------------------------------------------------------------
// Command wrappers
// ---------------------------------------------------------------------------

/**
 * Scan a local directory for C64 ROM files (.d64, .t64, .tap, etc.).
 * Returns CRC32 hashes computed in streaming Rust without loading full ROMs into memory.
 * Falls back to empty array in browser dev mode.
 */
export async function scanRomDirectory(directory: string): Promise<ScannedRom[]> {
  if (!isTauri()) {
    console.warn('[tauri-bridge] scanRomDirectory: not in Tauri, returning empty list');
    return [];
  }
  return invoke<ScannedRom[]>('scan_rom_directory', { directory });
}

/**
 * Launch an emulator (e.g. VICE x64sc) with the given ROM and game flags.
 * The Rust layer validates all paths before spawning the process.
 */
export async function launchEmulator(request: LaunchRequest): Promise<LaunchResult> {
  if (!isTauri()) {
    console.warn('[tauri-bridge] launchEmulator: not in Tauri - would launch:', request);
    return { success: false, message: 'Not running in desktop mode' };
  }
  return invoke<LaunchResult>('launch_emulator', { request });
}

/**
 * Check whether a media asset exists on the local filesystem.
 * Returns the absolute path and an existence flag.
 */
export async function resolveMediaPath(
  baseDir: string,
  filename: string
): Promise<ResolvedPath> {
  if (!isTauri()) {
    return { exists: false, absolute_path: `${baseDir}/${filename}` };
  }
  return invoke<ResolvedPath>('resolve_media_path', { baseDir, filename });
}

/**
 * Check for multiple screenshot variants (_1, _2, _a, _b etc) on the local filesystem
 */
export async function findAllMediaVariants(
  baseDir: string,
  filename: string
): Promise<string[]> {
  if (!isTauri()) {
    return [`${baseDir}/${filename}`];
  }
  return invoke<string[]>('find_all_media_variants', { baseDir, filename });
}

/**
 * Download a file from a URL to the local filesystem.
 */
export async function downloadMediaAsset(url: string, destDir: string, filename: string): Promise<ResolvedPath> {
  if (!isTauri()) {
    console.warn('[tauri-bridge] downloadMediaAsset: not in Tauri - saving to memory: ', { url, destDir, filename });
    return { exists: true, absolute_path: url };
  }
  return invoke<ResolvedPath>('download_media_asset', { url, destDir, filename });
}

/**
 * Transforms an absolute filesystem path into a Tauri asset:// URL.
 * Falls back to returning the path directly in web contexts.
 */
export async function getAssetUrl(absolutePath: string): Promise<string> {
  if (!isTauri()) {
    return absolutePath;
  }
  const { convertFileSrc } = await import('@tauri-apps/api/core');
  // Normalize windows paths to use forward slashes for the internal URL conversion
  const normalized = absolutePath.replace(/\\/g, '/');
  return convertFileSrc(normalized);
}

/**
 * Reads the direct raw bytes of a file from the user's filesystem.
 * Required for passing data to the iframe WASM emulator.
 */
export async function readFileBytes(absolutePath: string): Promise<Uint8Array> {
  if (!isTauri()) {
    console.warn('[tauri-bridge] readFileBytes: not in Tauri - fetching via standard fetch() for dev mode:', absolutePath);
    const res = await fetch(`/${absolutePath.split('/').pop()}`);
    if (!res.ok) throw new Error('File not found in dev mode');
    const arrayBuffer = await res.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }
  const bytes = await invoke<number[]>('read_file_bytes', { path: absolutePath });
  return new Uint8Array(bytes);
}

/**
 * Generates an ObjectURL using the binary contents of the local file.
 * Required for jsSID playing because XMLHttpRequest fails on asset:// protocols.
 */
export async function getMediaUrl(absolutePath: string): Promise<string> {
  const bytes = await readFileBytes(absolutePath);
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/octet-stream' });
  return URL.createObjectURL(blob);
}

/**
 * Opens the native OS folder picker and returns the selected path.
 * Falls back to null in browser mode (SettingsModal uses this for the "Browse" button).
 */
export async function openDirectoryDialog(): Promise<string | null> {
  if (!isTauri()) {
    console.warn('[tauri-bridge] openDirectoryDialog: not in Tauri');
    return null;
  }
  return invoke<string | null>('open_directory_dialog');
}

/**
 * Opens the native OS file picker and returns the selected path.
 * Falls back to null in browser mode.
 */
export async function openFileDialog(): Promise<string | null> {
  if (!isTauri()) {
    console.warn('[tauri-bridge] openFileDialog: not in Tauri');
    return null;
  }
  return invoke<string | null>('open_file_dialog');
}

/**
 * Exit the application immediately.
 */
export async function exitApp(): Promise<void> {
  if (!isTauri()) {
    console.warn('[tauri-bridge] exitApp: not in Tauri');
    return;
  }
  return invoke<void>('exit_app');
}

/**
 * Update window display mode (fullscreen/windowed) and resolution.
 */
export async function setWindowMode(fullscreen: boolean, width?: number, height?: number): Promise<void> {
  if (!isTauri()) {
    console.warn('[tauri-bridge] setWindowMode: not in Tauri - Mode:', { fullscreen, width, height });
    return;
  }
  return invoke<void>('set_window_mode', { fullscreen, width, height });
}

/**
 * Get current window dimensions.
 */
export async function getWindowSize(): Promise<{ width: number, height: number } | null> {
  if (!isTauri()) return null;
  return invoke<{ width: number, height: number }>('get_window_size');
}

/**
 * Open a file or folder using the default OS handler.
 */
export async function openFile(path: string): Promise<void> {
  if (!isTauri()) {
    console.warn('[tauri-bridge] openFile: not in Tauri - path:', path);
    window.open(path, '_blank');
    return;
  }
  const { open } = await import('@tauri-apps/plugin-shell');
  return open(path);
}

export interface GameFilters {
  searchQuery?: string;
  letter?: string;
  genre?: string;
  favoriteIds?: string[];
  hideAdult?: boolean;
  isClassic?: boolean;
}

export async function getGenres(): Promise<string[]> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<string[]>('get_genres');
  } catch {
    // Fallback to the known GB64 genres for browser dev mode
    return ["Adventure","Arcade","Board Game","Brain","Cards","Educational","Gambling","Miscellaneous","Racing","Shoot'em Up","Simulation","Sports","Strategy"];
  }
}

/**
 * Fetch extras for a specific game from the database.
 */
export async function getGameExtras(gameId: number): Promise<import('../types/game').Extra[]> {
  if (!isTauri()) {
    return [];
  }
  try {
    const rawExtras = await invoke<any[]>('get_game_extras', { gameId: gameId.toString() });
    return rawExtras.map(ex => ({
      id: ex.id,
      name: ex.name,
      path: ex.path,
      type: ex.extraType,
    }));
  } catch (err) {
    console.error('Failed to fetch extras:', err);
    return [];
  }
}

/**
 * Fetch games from the local SQLite database.
 * In browser mode (dev), this falls back to the mock games array.
 */
export async function getDbGames(limit: number = 50, offset: number = 0, filters?: GameFilters): Promise<import('../types/game').Game[]> {
  if (!isTauri()) {
    console.warn('[tauri-bridge] getDbGames: not in Tauri, falling back to mockData');
    const { mockGames } = await import('../data/mockGames');
    return mockGames.slice(offset, offset + limit);
  }
  
  try {
    const rawGames = await invoke<any[]>('get_db_games', { limit, offset, filters });
    
    // Map the raw GameRow objects back into our nested Game interface
    const controlMap: Record<string, string> = {
      '0': 'Joystick Port 2',
      '1': 'Joystick Port 1',
      '2': 'Keyboard',
      '3': 'Paddles Port 2',
      '4': 'Paddles Port 1',
      '5': 'Lightpen',
      '6': 'Mouse Port 1',
      '7': 'Mouse Port 2',
      '8': 'Koala Pad',
      '9': 'Lightgun',
    };

    return rawGames.map((row) => ({
      id: parseInt(row.id, 10),
      name: row.name,
      filename: row.filename,
      gameFilename: row.gameFilename ?? null,
      screenshotFilename: row.screenshotFilename ?? null,
      boxFrontFilename: row.boxFrontFilename ?? null,
      titlescreenFilename: row.titlescreenFilename ?? null,
      videoSnapFilename: row.videoSnapFilename ?? null,
      sidFilename: row.sidFilename ?? null,
      crc: row.crc ?? '',
      year: row.year ? parseInt(row.year, 10) : null,
      isPal: row.isPal,
      isNtsc: row.isNtsc,
      trueDriveEmu: row.trueDriveEmu,
      isClassic: row.isClassic,
      parentGenre: row.parentGenre,
      subGenre: row.subGenre,
      developer: row.developerName ? { id: -1, name: row.developerName } : null,
      publisher: row.publisherName ? { id: -1, name: row.publisherName } : null,
      musician: row.musicianName ? { 
        id: -1, 
        name: row.musicianName, 
        photoPath: row.musicianPhoto ?? null,
        group: row.musicianGroup ?? null,
        nick: row.musicianNick ?? null
      } : null,
      control: row.control ? (controlMap[row.control] || row.control) : 'Joystick',
      playersFrom: row.playersFrom ?? null,
      playersTo: row.playersTo ?? null,
      playersSim: row.playersSim ?? null,
      comment: row.comment ?? null,
      reviewRating: row.reviewRating ?? null,
      languages: row.languages ? [row.languages] : [],
      coderName: row.coderName ?? null,
      graphicsName: row.graphicsName ?? null,
      versionBy: row.versionBy ?? null,
      vTrainers: row.vTrainers ?? null,
      vLength: row.vLength ?? null,
      vLoadingScreen: row.vLoadingScreen ?? null,
      vHighScoreSaver: row.vHighScoreSaver ?? null,
      vIncludedDocs: row.vIncludedDocs ?? null,
      vTrueDriveEmu: row.vTrueDriveEmu ?? null,
      vPalNtsc: (() => {
        if (!row.vPalNtsc) return null;
        const val = row.vPalNtsc.toString().trim();
        const map: Record<string, string> = {
          '1': 'PAL',
          '2': 'NTSC',
          '3': 'PAL / NTSC',
          '4': 'NTSC / PAL',
          'P': 'PAL',
          'N': 'NTSC',
          'B': 'Both (PAL & NTSC)'
        };
        return map[val] || val;
      })(),
      memo: row.memo ?? null,
    }));
  } catch (err) {
    console.error('Failed to get games from database:', err);
    return [];
  }
}

/**
 * Save a sensitive setting encrypted in the local SQLite database.
 */
export async function saveSecureSetting(key: string, value: string): Promise<void> {
  if (!isTauri()) {
    localStorage.setItem(`secure_${key}`, value);
    return;
  }
  return invoke<void>('save_secure_setting', { key, value });
}

/**
 * Retrieve and decrypt a sensitive setting from the local SQLite database.
 */
export async function getSecureSetting(key: string): Promise<string | null> {
  if (!isTauri()) {
    return localStorage.getItem(`secure_${key}`);
  }
  return invoke<string | null>('get_secure_setting', { key });
}

