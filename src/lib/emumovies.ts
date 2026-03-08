/**
 * emumovies.ts
 *
 * EmuMovies API integration for downloading video snaps, box art,
 * and other media for C64 games.
 *
 * API Docs: https://emumovies.com/api
 * System Name for C64: "Commodore 64"
 */

const EMUMOVIES_BASE = 'https://api.emumovies.com/api';
const C64_SYSTEM = 'Commodore_64';

export interface EmuMoviesSearchResult {
  id: string;
  name: string;
  mediaType: string;
  url: string;
  previewUrl: string;
}

export interface EmuMoviesDownloadResult {
  success: boolean;
  localPath?: string;
  error?: string;
}

/**
 * Search EmuMovies for media assets for a given game title.
 *
 * @param apiKey  - User's EmuMovies API key (from settings)
 * @param gameName - Game title to search for
 * @param mediaType - Type of media: 'Video', 'Box_Front', 'Screenshot', 'Title_Screenshot'
 */
export async function searchEmuMovies(
  apiKey: string,
  gameName: string,
  mediaType: 'Video' | 'Box_Front' | 'Screenshot' | 'Title_Screenshot' = 'Video'
): Promise<EmuMoviesSearchResult[]> {
  if (!apiKey) {
    throw new Error('EmuMovies API key is not configured. Go to Settings → EmuMovies.');
  }

  const params = new URLSearchParams({
    systemname: C64_SYSTEM,
    gamename: gameName,
    mediatype: mediaType,
  });

  const response = await fetch(`${EMUMOVIES_BASE}/Media/GetMedia?${params}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('EmuMovies API key is invalid or expired.');
    }
    throw new Error(`EmuMovies API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  // Normalize the API response shape
  return (data?.results ?? []).map((item: Record<string, string>) => ({
    id:          item.id ?? item.ID ?? '',
    name:        item.name ?? item.Name ?? gameName,
    mediaType:   item.mediatype ?? mediaType,
    url:         item.url ?? item.URL ?? '',
    previewUrl:  item.previewurl ?? item.preview_url ?? item.url ?? '',
  }));
}

/**
 * Download a media file from EmuMovies and save it to the user's local media dir.
 * In Tauri desktop mode, we delegate the actual disk write to a Rust command.
 * In browser mode, we return the URL for in-app use.
 *
 * @param url        - Media URL from EmuMovies
 * @param destDir    - Local directory to save into (e.g. settings.screenshotsPath)
 * @param filename   - Filename to save as
 */
export async function downloadEmuMoviesAsset(
  url: string,
  destDir: string,
  filename: string
): Promise<EmuMoviesDownloadResult> {
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

  if (!isTauri) {
    // In browser mode, we can't write files — return for preview
    return { success: true, localPath: url };
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<{ success: boolean; path: string; error?: string }>(
      'download_media_asset',
      { url, destDir, filename }
    );
    return { success: result.success, localPath: result.path, error: result.error };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Convenience: fetch the best video snap URL for a game (used for preview without saving).
 * Returns null if no results found.
 */
export async function getVideoSnapUrl(apiKey: string, gameName: string): Promise<string | null> {
  if (!apiKey) return null;
  try {
    const results = await searchEmuMovies(apiKey, gameName, 'Video');
    return results.length > 0 ? results[0].url : null;
  } catch {
    return null;
  }
}
