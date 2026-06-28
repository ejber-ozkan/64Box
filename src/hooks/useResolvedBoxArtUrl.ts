"use client";

import { useEffect, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { supportsAtariExtraCoverArt } from '../lib/extras';
import { getAssetUrl, resolveMediaPath as resolveNativeMediaPath } from '../lib/tauri-bridge';
import type { Game } from '../types/game';

const COVER_ART_URL_CACHE = new Map<string, Promise<string | null>>();

function normalizePath(path: string) {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
}

function getResolvedCoverArtUrl(extrasPath: string, coverPath: string) {
  const cacheKey = `${extrasPath}|${coverPath}`;
  const cached = COVER_ART_URL_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = (async () => {
    const resolved = await resolveNativeMediaPath(extrasPath, normalizePath(coverPath));
    if (!resolved.exists) {
      return null;
    }

    return getAssetUrl(resolved.absolute_path);
  })().catch(() => null);

  COVER_ART_URL_CACHE.set(cacheKey, promise);
  return promise;
}

type ResolvedBoxArtGame = Pick<Game, 'boxFrontFilename' | 'coverPath'>;

export function useResolvedBoxArtUrl(game: ResolvedBoxArtGame, fallbackUrl = '') {
  const { settings, resolveMediaPath } = useSettings();
  const activePlatformExtrasPath = settings.platformSettings[settings.activePlatformId]?.folders.extrasPath || settings.extrasPath;
  const canResolveExtraCoverArt = supportsAtariExtraCoverArt(settings.activePlatformId);
  const [artUrl, setArtUrl] = useState(
    game.boxFrontFilename ? resolveMediaPath('screenshot', game.boxFrontFilename) : fallbackUrl,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadArt() {
      if (canResolveExtraCoverArt && activePlatformExtrasPath.trim() && game.coverPath) {
        const resolvedCoverUrl = await getResolvedCoverArtUrl(activePlatformExtrasPath.trim(), game.coverPath);
        if (!cancelled && resolvedCoverUrl) {
          setArtUrl(resolvedCoverUrl);
          return;
        }
      }

      if (!cancelled) {
        setArtUrl(game.boxFrontFilename ? resolveMediaPath('screenshot', game.boxFrontFilename) : fallbackUrl);
      }
    }

    void loadArt();

    return () => {
      cancelled = true;
    };
  }, [activePlatformExtrasPath, canResolveExtraCoverArt, fallbackUrl, game.boxFrontFilename, game.coverPath, resolveMediaPath]);

  return artUrl;
}
