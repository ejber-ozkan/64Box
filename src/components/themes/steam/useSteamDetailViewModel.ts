"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../../../contexts/SettingsContext';
import { useGamepad } from '../../../hooks/useGamepad';
import { DetailNavigationHook } from '../../../hooks/useDetailNavigation';
import {
  getAssetUrl,
  getGameExtras,
  launchEmulator,
  openFile,
  resolveMediaPath as resolveNativeMediaPath,
} from '../../../lib/tauri-bridge';
import { groupExtras } from '../../../lib/extras';
import {
  buildExtraAbsolutePath,
  getExtraLaunchLabel,
  isImageExtra,
  isLaunchableExtra,
} from '../../../lib/steam-extras';
import { Extra, Game } from '../../../types/game';

export type SteamTab = 'gallery' | 'extras' | 'extras-gallery';

export interface FullscreenExtraState {
  src: string;
  title: string;
  caption: string;
}

interface UseSteamDetailViewModelProps {
  game: Game;
  nav: DetailNavigationHook;
  onFullscreen: (filename: string | null) => void;
}

const GALLERY_GRID_COLUMNS = 3;
const EXTRAS_GRID_COLUMNS = 2;

export function useSteamDetailViewModel({
  game,
  nav,
  onFullscreen,
}: UseSteamDetailViewModelProps) {
  const { settings, resolveMediaPath } = useSettings();
  const [activeTab, setActiveTab] = useState<SteamTab>('gallery');
  const [extras, setExtras] = useState<Extra[]>([]);
  const [boxArtUrl, setBoxArtUrl] = useState('');
  const [galleryItemIndex, setGalleryItemIndex] = useState(0);
  const [launchableItemIndex, setLaunchableItemIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [fullscreenExtra, setFullscreenExtra] = useState<FullscreenExtraState | null>(null);
  const gameplaySectionRef = useRef<HTMLDivElement | null>(null);
  const titleSectionRef = useRef<HTMLDivElement | null>(null);
  const heroControlsRef = useRef<HTMLDivElement | null>(null);
  const gallerySectionRef = useRef<HTMLDivElement | null>(null);
  const extrasSectionRef = useRef<HTMLDivElement | null>(null);
  const galleryCardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const launchableCardRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    getGameExtras(game.id).then(setExtras);
  }, [game.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadBoxArt() {
      if (settings.extrasPath && game.coverPath) {
        const resolved = await resolveNativeMediaPath(settings.extrasPath, game.coverPath);
        if (resolved.exists) {
          const assetUrl = await getAssetUrl(resolved.absolute_path);
          if (!cancelled) {
            setBoxArtUrl(assetUrl);
          }
          return;
        }
      }

      if (!cancelled) {
        setBoxArtUrl(game.boxFrontFilename ? resolveMediaPath('screenshot', game.boxFrontFilename) : '');
      }
    }

    void loadBoxArt();
    return () => {
      cancelled = true;
    };
  }, [game.boxFrontFilename, game.coverPath, resolveMediaPath, settings.extrasPath]);

  const groupedExtras = useMemo(() => groupExtras(extras), [extras]);
  const galleryExtras = useMemo(
    () => groupedExtras.filter((group) => group.category === 'visual' || group.category === 'media').flatMap((group) => group.items),
    [groupedExtras]
  );
  const launchableExtras = useMemo(
    () => (groupedExtras.find((group) => group.category === 'games')?.items ?? []).filter(isLaunchableExtra),
    [groupedExtras]
  );
  const availableTabs = useMemo(() => {
    const tabs: SteamTab[] = ['gallery'];
    if (launchableExtras.length > 0) tabs.push('extras');
    if (galleryExtras.length > 0) tabs.push('extras-gallery');
    return tabs;
  }, [galleryExtras.length, launchableExtras.length]);
  const visibleTab = availableTabs.includes(activeTab) ? activeTab : 'gallery';
  const gallerySelectionIndex = Math.min(galleryItemIndex, Math.max(galleryExtras.length - 1, 0));
  const launchableSelectionIndex = Math.min(launchableItemIndex, Math.max(launchableExtras.length - 1, 0));
  const hasGameplayMedia = Boolean(game.videoSnapFilename || game.screenshotFilename);
  const hasTitleMedia = Boolean(game.titlescreenFilename);
  const hasBoxArt = Boolean(boxArtUrl);
  const hasGalleryExtras = galleryExtras.length > 0;
  const galleryFocusZone = hasGameplayMedia ? 'media-gameplay' : hasTitleMedia ? 'media-titlescreen' : 'sid';
  const focusedGalleryExtra = galleryExtras[gallerySelectionIndex] ?? null;
  const focusedLaunchableExtra = launchableExtras[launchableSelectionIndex] ?? null;

  useEffect(() => {
    if (!statusMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setStatusMessage(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [statusMessage]);

  useGamepad({
    onButtonDown: (button) => {
      if (fullscreenExtra && button === 'B') {
        setFullscreenExtra(null);
      }
    },
  });

  useEffect(() => {
    if (!fullscreenExtra) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault();
        setFullscreenExtra(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenExtra]);

  const showStatus = useCallback((message: string) => {
    setStatusMessage(message);
  }, []);

  useEffect(() => {
    if (visibleTab === 'gallery' && nav.focusedZone === 'media-extras') {
      galleryCardRefs.current[gallerySelectionIndex]?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'smooth',
      });
      gallerySectionRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    if (visibleTab === 'extras' && nav.focusedZone === 'media-extras') {
      launchableCardRefs.current[launchableSelectionIndex]?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'smooth',
      });
      extrasSectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    if (nav.focusedZone === 'media-gameplay') {
      gameplaySectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    if (nav.focusedZone === 'media-titlescreen') {
      titleSectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    if (nav.focusedZone === 'play' || nav.focusedZone === 'play-web') {
      heroControlsRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [gallerySelectionIndex, launchableSelectionIndex, nav.focusedZone, visibleTab]);

  const handleOpenGalleryExtra = useCallback(async (extra: Extra) => {
    if (!settings.extrasPath) {
      showStatus('Set an Extras path in Settings to open gallery media.');
      return;
    }

    const fullPath = buildExtraAbsolutePath(settings.extrasPath, extra.path);
    if (isImageExtra(extra)) {
      const assetUrl = await getAssetUrl(fullPath);
      setFullscreenExtra({
        src: assetUrl,
        title: extra.name,
        caption: extra.path,
      });
      return;
    }

    await openFile(fullPath);
  }, [settings.extrasPath, showStatus]);

  const handleLaunchExtra = useCallback(async (extra: Extra) => {
    const isRetroarch = settings.preferredEmulator === 'retroarch';
    const emulatorPath = isRetroarch ? settings.retroarchPath : settings.emulatorPath;

    if (!emulatorPath) {
      showStatus(`Set your ${isRetroarch ? 'RetroArch' : 'VICE'} path in Settings before launching extras.`);
      return;
    }

    if (isRetroarch && !settings.retroarchCorePath) {
      showStatus('RetroArch needs a core path before extras can be launched.');
      return;
    }

    if (!settings.extrasPath) {
      showStatus('Set an Extras path in Settings before launching extras.');
      return;
    }

    const fullRomPath = buildExtraAbsolutePath(settings.extrasPath, extra.path);
    showStatus(`${getExtraLaunchLabel(extra)}: ${extra.name}`);

    try {
      const result = await launchEmulator({
        emulator_path: emulatorPath,
        rom_path: fullRomPath,
        true_drive_emulation: game.trueDriveEmu ?? false,
        is_pal: game.isPal ?? true,
        game_id: game.id.toString(),
        core_path: isRetroarch ? settings.retroarchCorePath : undefined,
      });

      if (!result.success) {
        showStatus(`Launch failed: ${result.message}`);
        return;
      }

      setStatusMessage(null);
    } catch (error) {
      showStatus(`Launch failed: ${String(error)}`);
    }
  }, [
    game.id,
    game.isPal,
    game.trueDriveEmu,
    settings.emulatorPath,
    settings.extrasPath,
    settings.preferredEmulator,
    settings.retroarchCorePath,
    settings.retroarchPath,
    showStatus,
  ]);

  const selectTab = useCallback((tab: SteamTab) => {
    setActiveTab(tab);
    nav.setFocusedZone(tab === 'gallery' ? galleryFocusZone : 'media-extras');
  }, [galleryFocusZone, nav]);

  useEffect(() => {
    nav.registerAction('play', () => document.getElementById('play-game-btn')?.click());
    nav.registerAction('play-web', () => document.getElementById('play-browser-btn')?.click());
    nav.registerAction('sid', () => document.getElementById('sid-play-btn')?.click());

    nav.registerAction('media-gameplay', () => {
      if (game.screenshotFilename) {
        onFullscreen(game.screenshotFilename);
      }
    });
    nav.registerAction('media-titlescreen', () => {
      if (game.titlescreenFilename) {
        onFullscreen(game.titlescreenFilename);
      }
    });
    nav.registerAction('media-extras', () => {
      if (visibleTab === 'extras-gallery' && focusedGalleryExtra) {
        void handleOpenGalleryExtra(focusedGalleryExtra);
        return;
      }

      if (visibleTab === 'extras' && focusedLaunchableExtra) {
        void handleLaunchExtra(focusedLaunchableExtra);
        return;
      }

      if (launchableExtras.length > 0) {
        setActiveTab('extras');
        nav.setFocusedZone('media-extras');
      }
    });

    nav.registerDirectionalOverride('media-extras', (direction) => {
      const isGalleryTab = visibleTab === 'extras-gallery';
      const items = isGalleryTab ? galleryExtras : launchableExtras;
      if (items.length === 0) {
        return false;
      }

      const columns = isGalleryTab ? GALLERY_GRID_COLUMNS : EXTRAS_GRID_COLUMNS;
      const index = isGalleryTab ? gallerySelectionIndex : launchableSelectionIndex;
      const setIndex = isGalleryTab ? setGalleryItemIndex : setLaunchableItemIndex;

      if (direction === 'left' && index % columns !== 0) {
        setIndex(index - 1);
        return true;
      }

      if (direction === 'right' && index + 1 < items.length && index % columns !== columns - 1) {
        setIndex(index + 1);
        return true;
      }

      if (direction === 'up') {
        if (index - columns >= 0) {
          setIndex(index - columns);
          return true;
        }

        if (isGalleryTab || visibleTab === 'extras') {
          nav.setFocusedZone(hasGameplayMedia ? 'media-gameplay' : hasTitleMedia ? 'media-titlescreen' : 'play');
          return true;
        }
      }

      if (direction === 'down' && index + columns < items.length) {
        setIndex(index + columns);
        return true;
      }

      return false;
    });

    nav.registerTabActions({
      previous: () => {
        const currentIndex = availableTabs.indexOf(visibleTab);
        const previousTab = availableTabs[(currentIndex - 1 + availableTabs.length) % availableTabs.length];
        selectTab(previousTab);
      },
      next: () => {
        const currentIndex = availableTabs.indexOf(visibleTab);
        const nextTab = availableTabs[(currentIndex + 1) % availableTabs.length];
        selectTab(nextTab);
      },
    });
  }, [
    availableTabs,
    focusedGalleryExtra,
    focusedLaunchableExtra,
    galleryExtras,
    gallerySelectionIndex,
    game.screenshotFilename,
    game.titlescreenFilename,
    handleLaunchExtra,
    handleOpenGalleryExtra,
    hasGameplayMedia,
    hasTitleMedia,
    launchableExtras,
    launchableSelectionIndex,
    nav,
    onFullscreen,
    selectTab,
    visibleTab,
  ]);

  const zoneLabels: Record<string, string> = {
    play: '▶ Launch Emulator [A]',
    'play-web': '▶ Play Embedded [A]',
    favorite: '♥ Favorite [A]',
    sid: '🎵 Sid Player [A]',
    'media-gameplay': '🕹️ Gameplay Gallery [A]',
    'media-titlescreen': '🖼️ Title Gallery [A]',
    'media-extras': visibleTab === 'extras' ? '🎁 Alternate Versions [A]' : '🖼️ Extras Gallery [A]',
  };

  return {
    availableTabs,
    boxArtUrl,
    extras,
    extrasSectionRef,
    fullscreenExtra,
    galleryCardRefs,
    galleryExtras,
    galleryFocusZone,
    gallerySectionRef,
    gallerySelectionIndex,
    gameplaySectionRef,
    handleLaunchExtra,
    handleOpenGalleryExtra,
    hasBoxArt,
    hasGalleryExtras,
    hasGameplayMedia,
    hasTitleMedia,
    heroControlsRef,
    launchableCardRefs,
    launchableExtras,
    launchableSelectionIndex,
    selectTab,
    setFullscreenExtra,
    setGalleryItemIndex,
    setLaunchableItemIndex,
    statusMessage,
    titleSectionRef,
    visibleTab,
    zoneLabels,
  };
}
