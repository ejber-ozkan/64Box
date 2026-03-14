"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { ImageWithFallback } from '../ImageWithFallback';
import { ImageSlider } from '../ImageSlider';
import { SidPlayer } from '../SidPlayer';
import { PlayButton } from './PlayButton';
import { DetailLayoutProps } from '../DetailView';
import { StatusRow } from '../StatusRow';
import { getAssetUrl, getGameExtras, launchEmulator, openFile, resolveMediaPath as resolveNativeMediaPath } from '../../lib/tauri-bridge';
import { Extra } from '../../types/game';
import { groupExtras } from '../../lib/extras';
import { useGamepad } from '../../hooks/useGamepad';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']);
const VIDEO_EXTENSIONS = new Set(['mkv', 'mp4', 'avi', 'mov', 'webm']);
const LAUNCHABLE_ROOTS = ['tapes', 'disks', 'carts', 'coverdisks', 'covertapes', 'pd-disks', 'type-ins'];
const GALLERY_GRID_COLUMNS = 3;
const EXTRAS_GRID_COLUMNS = 2;

function buildExtraAbsolutePath(extrasPath: string | undefined, extraPath: string) {
  const cleanExtrasPath = (extrasPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
  const cleanExtraPath = extraPath.replace(/\\/g, '/').replace(/^\/+/, '');
  return [cleanExtrasPath, cleanExtraPath].filter(Boolean).join('/');
}

function getExtraExtension(extra: Extra) {
  return extra.path.split('.').pop()?.toLowerCase() || '';
}

function isImageExtra(extra: Extra) {
  return IMAGE_EXTENSIONS.has(getExtraExtension(extra));
}

function isVideoExtra(extra: Extra) {
  return VIDEO_EXTENSIONS.has(getExtraExtension(extra));
}

function getExtraSourceLabel(extra: Extra) {
  return extra.path.split(/[\\/]/)[0] || 'Extras';
}

function getLaunchLabel(extra: Extra) {
  const root = getExtraSourceLabel(extra).toLowerCase();
  if (root.includes('tape')) return 'Launch Tape';
  if (root.includes('disk')) return 'Launch Disk';
  if (root.includes('cart')) return 'Launch Cart';
  return 'Launch Variant';
}

function isLaunchableExtra(extra: Extra) {
  const root = getExtraSourceLabel(extra).toLowerCase();
  return LAUNCHABLE_ROOTS.some((candidate) => root.includes(candidate));
}

export function SteamLibraryLayout({ game, onBack, nav, onFullscreen, isFavorite, onToggleFavorite }: DetailLayoutProps) {
  const { settings, resolveMediaPath } = useSettings();
  const [activeTab, setActiveTab ] = useState<'gallery' | 'extras' | 'extras-gallery'>('gallery');
  const [extras, setExtras] = useState<Extra[]>([]);
  const [boxArtUrl, setBoxArtUrl] = useState('');
  const [galleryItemIndex, setGalleryItemIndex] = useState(0);
  const [launchableItemIndex, setLaunchableItemIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [fullscreenExtra, setFullscreenExtra] = useState<{ src: string; title: string; caption: string } | null>(null);
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

    loadBoxArt();
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
    const tabs: Array<'gallery' | 'extras' | 'extras-gallery'> = ['gallery'];
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
    showStatus(`${getLaunchLabel(extra)}: ${extra.name}`);

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

  // Register theme actions
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

        return false;
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
        setActiveTab(previousTab);
        nav.setFocusedZone(previousTab === 'gallery' ? galleryFocusZone : 'media-extras');
      },
      next: () => {
        const currentIndex = availableTabs.indexOf(visibleTab);
        const nextTab = availableTabs[(currentIndex + 1) % availableTabs.length];
        setActiveTab(nextTab);
        nav.setFocusedZone(nextTab === 'gallery' ? galleryFocusZone : 'media-extras');
      },
    });
  }, [
    availableTabs,
    focusedGalleryExtra,
    focusedLaunchableExtra,
    galleryExtras,
    galleryFocusZone,
    gallerySelectionIndex,
    game.screenshotFilename,
    game.titlescreenFilename,
    handleLaunchExtra,
    handleOpenGalleryExtra,
    hasGalleryExtras,
    hasGameplayMedia,
    hasTitleMedia,
    launchableExtras,
    launchableSelectionIndex,
    nav,
    onFullscreen,
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

  const extrasTabFocused = nav.focusedZone === 'media-extras' && visibleTab === 'extras';
  const extrasGalleryTabFocused = nav.focusedZone === 'media-extras' && visibleTab === 'extras-gallery';

  return (
    <div className="flex flex-col h-full bg-[#1b2838] text-[#c6d4df] font-sans overflow-hidden">
      
      {/* Top Header / Mode Bar */}
      <div className="bg-[#171d24] px-6 py-2 border-b border-[#2a475e]/30 flex justify-between items-center z-30">
        <button
          onClick={onBack}
          className="px-4 py-1.5 bg-[#2a475e] hover:bg-[#66c0f4] hover:text-white rounded-sm text-[#c6d4df] text-sm uppercase transition-colors"
        >
          ← Library
        </button>

        {/* Debug Status bar */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#3d4450] uppercase font-bold text-[10px]">Controller Mode</span>
          <span className="px-3 py-1 bg-[#2a475e] border border-[#66c0f4]/50 text-[#66c0f4] font-bold rounded-sm animate-pulse min-w-[140px] text-center uppercase tracking-tighter">
            {zoneLabels[nav.focusedZone] ?? nav.focusedZone}
          </span>
          <span className="px-3 py-1 bg-black/40 text-gray-500 rounded-sm font-mono text-[9px] min-w-[100px] text-center lowercase border border-white/5">
             {nav.lastAction}
          </span>
          <span className="text-[#3d4450] uppercase font-bold text-[10px] ml-2">B Back</span>
        </div>
      </div>

      {/* Top Banner section */}
      <div className="relative shrink-0 border-b border-[#2a475e] bg-[#0f1922] px-8 py-6 xl:px-10 xl:py-7 transition-all">
        <div 
           className="absolute inset-0 opacity-20 transition-opacity duration-1000"
           style={{ 
             backgroundImage: game.screenshotFilename ? `url(${resolveMediaPath('screenshot', game.screenshotFilename)})` : '',
             backgroundSize: 'cover',
             backgroundPosition: 'top center',
             filter: 'saturate(0)'
           }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1b2838] to-transparent z-10" />

        <div className="relative z-20 flex items-start gap-4 xl:gap-5">
          <button
            onClick={onToggleFavorite}
            onMouseEnter={() => nav.hoverZone('favorite')}
            className={`mt-1 inline-flex h-11 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-semibold uppercase tracking-[0.18em] transition-all ${
              isFavorite
                ? 'border-pink-300/70 bg-pink-500/20 text-pink-200'
                : 'border-white/15 bg-black/40 text-white/70 hover:border-pink-300/50 hover:text-pink-200'
            } ${nav.focusCls('favorite')}`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <span className="text-base leading-none">{isFavorite ? '♥' : '♡'}</span>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="mb-2 text-2xl font-light tracking-tight text-white xl:text-3xl 2xl:text-4xl">{game.name}</h1>
            <div className="flex flex-wrap items-center gap-y-2 text-xs xl:text-sm font-semibold uppercase tracking-wider text-[#66c0f4]">
              {[
                game.year,
                game.publisher?.name && game.publisher.name !== '(Not Published)' ? game.publisher.name : null,
                game.developer?.name && game.developer.name !== '(Unknown)' ? game.developer.name : null
              ].filter(Boolean).map((val, idx, arr) => (
                <span key={`${val}-${idx}`}>{val}{idx < arr.length - 1 && <span className="mx-2 text-[#3d4450]">•</span>}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-8 pb-8 pt-6 xl:px-10 xl:pb-10 xl:pt-6 w-full flex gap-8 xl:gap-10 transition-all">
        
        {/* Left column (Gallery) */}
        <div className="min-w-0 flex-[1.7]">
          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
            <div ref={heroControlsRef} className="xl:sticky xl:top-6 xl:self-start">
              <PlayButton game={game} nav={nav} />
            </div>

            <div className="flex flex-col gap-8">
              <div className="flex gap-1 border-b border-[#2a475e]">
            <div 
                onClick={() => setActiveTab('gallery')}
                className={`px-4 py-2 cursor-pointer font-medium text-lg uppercase transition-colors ${visibleTab === 'gallery' ? 'text-white border-b-2 border-[#66c0f4]' : 'text-gray-500 hover:text-white'}`}
              >
                Gallery
              </div>
              {launchableExtras.length > 0 && (
              <div 
                   onClick={() => setActiveTab('extras')}
                   onMouseEnter={() => nav.hoverZone('media-extras')}
                   className={`px-6 py-3 cursor-pointer font-medium text-lg xl:text-xl uppercase transition-all ${extrasTabFocused ? 'text-white drop-shadow-[0_0_18px_rgba(250,204,21,0.55)]' : ''} ${visibleTab === 'extras' ? 'text-white border-b-2 border-[#66c0f4]' : 'text-gray-500 hover:text-white'}`}
                >
                  Extras ({launchableExtras.length})
                </div>
              )}
              {hasGalleryExtras && (
                <div
                  onClick={() => setActiveTab('extras-gallery')}
                  onMouseEnter={() => nav.hoverZone('media-extras')}
                  className={`px-6 py-3 cursor-pointer font-medium text-lg xl:text-xl uppercase transition-all ${extrasGalleryTabFocused ? 'text-white drop-shadow-[0_0_18px_rgba(250,204,21,0.55)]' : ''} ${visibleTab === 'extras-gallery' ? 'text-white border-b-2 border-[#66c0f4]' : 'text-gray-500 hover:text-white'}`}
                >
                  Extras Alt. ({galleryExtras.length})
                </div>
              )}
              </div>

              {visibleTab === 'gallery' && (
                <div className="space-y-6">
                {(hasGameplayMedia || hasTitleMedia || hasBoxArt) && (
                  <div className={`grid gap-5 ${hasGameplayMedia && (hasTitleMedia || hasBoxArt) ? 'xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,0.95fr)]' : 'grid-cols-1'}`}>
                    {hasGameplayMedia && (
                      <div
                        ref={gameplaySectionRef}
                        onClick={() => onFullscreen(game.screenshotFilename)}
                        onMouseEnter={() => nav.hoverZone('media-gameplay')}
                        className={`aspect-[16/9] min-h-[340px] xl:min-h-[460px] 2xl:min-h-[540px] bg-[#0f1922] rounded shadow-md border border-[#2a475e] flex items-center justify-center p-3 transition cursor-pointer relative group overflow-hidden ${nav.focusCls('media-gameplay')}`}
                      >
                        {game.videoSnapFilename ? (
                          <video src={resolveMediaPath('screenshot', game.videoSnapFilename)} autoPlay loop muted className="w-full h-full object-contain pointer-events-none" />
                        ) : (
                          <ImageSlider type="screenshot" filename={game.screenshotFilename} alt="Screenshot" className="w-full h-full object-contain pointer-events-none" fallbackText="Gameplay" />
                        )}
                        <div className="absolute top-3 left-3 bg-black/80 px-2 rounded text-[10px] text-white uppercase tracking-widest">Gameplay</div>
                      </div>
                    )}

                    {(hasTitleMedia || hasBoxArt) && (
                      <div className={`grid gap-5 ${hasTitleMedia && hasBoxArt ? 'grid-cols-1' : 'grid-cols-1'}`}>
                        {hasTitleMedia && (
                          <div
                             ref={titleSectionRef}
                             onClick={() => onFullscreen(game.titlescreenFilename)}
                             onMouseEnter={() => nav.hoverZone('media-titlescreen')}
                             className={`aspect-[16/9] bg-[#0f1922] rounded shadow-md border border-[#2a475e] flex items-center justify-center p-3 transition cursor-pointer relative overflow-hidden ${nav.focusCls('media-titlescreen')}`}
                          >
                            <ImageWithFallback src={resolveMediaPath('screenshot', game.titlescreenFilename!)} alt="Title" fit="contain" className="w-full h-full pointer-events-none" fallbackText="Title Screen" />
                             <div className="absolute top-3 left-3 bg-black/80 px-2 rounded text-[10px] text-white uppercase tracking-widest">Title</div>
                          </div>
                        )}

                        {hasBoxArt && (
                          <div className="aspect-[4/5] max-h-[420px] bg-[#0f1922] rounded shadow-md border border-[#2a475e] flex items-center justify-center p-4 relative overflow-hidden">
                            <ImageWithFallback src={boxArtUrl} alt="Box Art" fit="contain" className="w-full h-full pointer-events-none" fallbackText="Box Front" />
                            <div className="absolute top-3 left-3 bg-black/80 px-2 rounded text-[10px] text-white uppercase tracking-widest">Box Art</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!hasGameplayMedia && !hasTitleMedia && !hasBoxArt && !hasGalleryExtras && (
                  <div className="p-12 bg-[#0f1922]/40 rounded-xl border border-[#2a475e]/30 text-center italic text-gray-500">
                    No gallery media is available for this title.
                  </div>
                )}
                </div>
              )}

              {visibleTab === 'extras-gallery' && (
                <div ref={gallerySectionRef} className="space-y-4 scroll-mt-24">
               {hasGalleryExtras ? (
                 <>
                   <div className="flex items-center gap-3">
                     <h3 className="text-white font-semibold uppercase tracking-[0.18em] text-sm">Extras Gallery</h3>
                     <div className="h-px flex-1 bg-gradient-to-r from-[#2a475e] to-transparent" />
                   </div>
                   <div
                     onMouseEnter={() => nav.hoverZone('media-extras')}
                     className={`rounded-2xl border bg-[#0f1922]/60 p-4 xl:p-5 transition-all ${
                       nav.focusedZone === 'media-extras' && visibleTab === 'extras-gallery'
                         ? 'border-yellow-300/80 shadow-[0_0_0_1px_rgba(250,204,21,0.45)]'
                         : 'border-[#2a475e]/60'
                     }`}
                   >
                     <div className="mb-4 flex items-center justify-between gap-4">
                       <div>
                         <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8f98a0]">Gallery & Media</p>
                         <p className="text-sm text-[#c6d4df]/80">Use D-pad, stick, or arrow keys to browse the extra artwork.</p>
                       </div>
                       <div className="rounded-full border border-[#66c0f4]/30 bg-[#66c0f4]/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[#66c0f4]">
                         {gallerySelectionIndex + 1} / {galleryExtras.length}
                       </div>
                     </div>
                     <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                       {galleryExtras.map((extra, index) => (
                         <SteamGalleryCard
                           key={extra.id}
                           extra={extra}
                           extrasPath={settings.extrasPath}
                           ref={(element) => {
                             galleryCardRefs.current[index] = element;
                           }}
                           selected={nav.focusedZone === 'media-extras' && visibleTab === 'extras-gallery' && gallerySelectionIndex === index}
                           onClick={() => {
                             setGalleryItemIndex(index);
                             void handleOpenGalleryExtra(extra);
                           }}
                           onHover={() => {
                             setGalleryItemIndex(index);
                             nav.hoverZone('media-extras');
                           }}
                         />
                       ))}
                     </div>
                   </div>
                 </>
               ) : (
                 <div className="p-12 bg-[#0f1922]/40 rounded-xl border border-[#2a475e]/30 text-center italic text-gray-500">
                   No extra gallery media is available for this title.
                 </div>
               )}
                </div>
              )}

              {visibleTab === 'extras' && (
                <div ref={extrasSectionRef} className="flex-1 overflow-x-hidden scroll-mt-24">
                {launchableExtras.length > 0 ? (
                  <div
                    onMouseEnter={() => nav.hoverZone('media-extras')}
                    className={`rounded-2xl border bg-[#0f1922]/60 p-4 xl:p-5 transition-all ${
                      nav.focusedZone === 'media-extras' && visibleTab === 'extras'
                        ? 'border-yellow-300/80 shadow-[0_0_0_1px_rgba(250,204,21,0.45)]'
                        : 'border-[#2a475e]/60'
                    }`}
                  >
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8f98a0]">Alternate Versions</p>
                        <p className="text-sm text-[#c6d4df]/80">Launch tape, disk, and cartridge variants directly from this page.</p>
                      </div>
                      <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                        {launchableSelectionIndex + 1} / {launchableExtras.length}
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {launchableExtras.map((extra, index) => (
                        <SteamLaunchableExtraCard
                          key={extra.id}
                          extra={extra}
                          ref={(element) => {
                            launchableCardRefs.current[index] = element;
                          }}
                          selected={nav.focusedZone === 'media-extras' && visibleTab === 'extras' && launchableSelectionIndex === index}
                          onClick={() => {
                            setLaunchableItemIndex(index);
                            void handleLaunchExtra(extra);
                          }}
                          onHover={() => {
                            setLaunchableItemIndex(index);
                            nav.hoverZone('media-extras');
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-12 bg-[#0f1922]/40 rounded-xl border border-[#2a475e]/30 text-center italic text-gray-500">
                    No alternate versions are available for this title.
                  </div>
                )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column (Metadata & credits) */}
        <div className="min-w-[320px] flex-1 flex flex-col gap-6">
            <div className="bg-[#0f1922]/80 border border-[#2a475e] rounded p-4 text-sm flex flex-col gap-3">
               <h3 className="uppercase text-[#66c0f4] border-b border-[#2a475e] pb-1 font-semibold">Game Info</h3>
               <div className="grid grid-cols-[100px_1fr] gap-x-1 gap-y-2">
                  <span className="text-gray-500 text-xs">Genre:</span> <span className="text-white text-xs">{game.parentGenre}</span>
                  <span className="text-gray-500 text-xs">Sub-genre:</span> <span className="text-white text-xs">{game.subGenre}</span>
                  <span className="text-gray-500 text-xs">System:</span> <span className="text-white text-xs">{game.isPal && 'PAL'} {game.isNtsc && 'NTSC'}</span>
                  <span className="text-gray-500 text-xs">Control:</span> <span className="text-white text-xs">{game.control || 'Joystick'}</span>
                  <span className="text-gray-500 text-xs">Players:</span> <span className="text-white text-xs">
                    {game.playersFrom === game.playersTo ? game.playersFrom : `${game.playersFrom}-${game.playersTo}`}
                  </span>
                  <span className="text-gray-500 text-xs">Rating:</span> <span className="text-yellow-500 text-xs">
                    {(() => {
                      const r = parseInt(game.reviewRating || "0");
                      if (r <= 0) return 'Not Rated';
                      const stars = Math.min(5, r);
                      return '★'.repeat(stars) + '☆'.repeat(5 - stars);
                    })()}
                  </span>
               </div>
            </div>

            <div className="bg-[#0f1922]/80 border border-[#2a475e] rounded p-4 text-sm flex flex-col gap-3">
               <h3 className="uppercase text-[#66c0f4] border-b border-[#2a475e] pb-1 font-semibold">Credits</h3>
               <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1 text-xs">
                  {game.coderName && game.coderName !== '(Unknown)' && (
                     <>
                        <span className="text-gray-500">Coding:</span> 
                        <span className="text-blue-300 truncate">{game.coderName}</span>
                     </>
                  )}
                  {game.graphicsName && game.graphicsName !== '(Unknown)' && (
                     <>
                        <span className="text-gray-500">Graphics:</span> 
                        <span className="text-green-300 truncate">{game.graphicsName}</span>
                     </>
                  )}
                  {game.musician && (
                     <>
                        <span className="text-gray-500">Music:</span> 
                        <span className="text-white truncate">{game.musician.name}</span>
                     </>
                  )}
                  {game.versionBy && game.versionBy !== '(None)' && (
                     <>
                        <span className="text-gray-500">Version By:</span> 
                        <span className="text-yellow-500/80 truncate">{game.versionBy}</span>
                      </>
                   )}
                </div>
            </div>

            <div className="bg-[#0f1922]/80 border border-[#2a475e] rounded p-4 text-sm flex flex-col gap-3">
               <h3 className="uppercase text-[#66c0f4] border-b border-[#2a475e] pb-1 font-semibold">Version Details</h3>
                <div className="flex flex-col gap-2">
                   <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Version By:</span> 
                      <span className="text-yellow-500/80 truncate text-right">{game.versionBy || '---'}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                      <span className="text-gray-500">PAL / NTSC:</span> 
                      <span className="text-blue-300 font-medium">{game.vPalNtsc || '---'}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Size:</span> 
                      <span className="text-white">{game.vLength ? `${game.vLength} Blocks` : '---'}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Trainers:</span> 
                      <span className="text-white">{game.vTrainers || '0'}</span>
                   </div>
                   
                   <div className="h-px bg-[#2a475e]/50 my-1" />
                   
                   <div className="space-y-2">
                     <StatusRow label="Loading Screen" value={game.vLoadingScreen} />
                     <StatusRow label="High Score Saver" value={game.vHighScoreSaver} />
                     <StatusRow label="Included Docs" value={game.vIncludedDocs} />
                     <StatusRow label="True Drive Emul" value={game.vTrueDriveEmu} />
                   </div>
                </div>
               {game.memo && (
                  <div className="mt-2 p-2 bg-black/40 rounded text-[10px] text-gray-400 italic font-mono border-l-2 border-red-500/50">
                     {game.memo}
                  </div>
               )}
            </div>
           
            <div 
              onMouseEnter={() => nav.hoverZone('sid')}
              className={`bg-[#0f1922]/80 border border-[#2a475e] rounded p-4 flex flex-col gap-3 transition-all ${nav.focusCls('sid')}`}
            >
               <h3 className="uppercase text-[#66c0f4] border-b border-[#2a475e] pb-1 text-sm font-semibold">Soundtrack Module</h3>
               <SidPlayer filename={game.sidFilename} />
            </div>
        </div>
      </div>

      {statusMessage && (
        <div className="pointer-events-none fixed bottom-8 left-1/2 z-[110] -translate-x-1/2 rounded-full border border-[#66c0f4]/40 bg-[#0f1922]/95 px-5 py-3 text-sm text-white shadow-2xl shadow-black/40 backdrop-blur-md">
          {statusMessage}
        </div>
      )}

      {fullscreenExtra && (
        <div
          data-detail-modal="open"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-8 backdrop-blur-md"
          onClick={() => setFullscreenExtra(null)}
        >
          <div className="relative flex h-[min(92vh,1400px)] w-[min(96vw,2200px)] flex-col items-center justify-center gap-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex h-full w-full items-center justify-center px-6 pb-24 pt-6">
            <ImageWithFallback
              src={fullscreenExtra.src}
              alt={fullscreenExtra.title}
              fit="contain"
              className="max-h-full max-w-full rounded-lg border border-white/10 shadow-2xl"
            />
            </div>
            <div className="absolute bottom-5 left-5 rounded-xl bg-black/70 px-4 py-3 backdrop-blur-md">
              <p className="text-lg font-semibold text-white">{fullscreenExtra.title}</p>
              <p className="text-xs uppercase tracking-[0.22em] text-white/60">{fullscreenExtra.caption}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/50">B / Esc to close</p>
            </div>
            <button
              className="absolute right-0 top-0 p-4 text-4xl font-light text-white transition-colors hover:text-yellow-400"
              onClick={() => setFullscreenExtra(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const SteamGalleryCard = forwardRef<HTMLButtonElement, {
  extra: Extra;
  extrasPath: string | undefined;
  selected: boolean;
  onClick: () => void;
  onHover: () => void;
}>(function SteamGalleryCard({
  extra,
  extrasPath,
  selected,
  onClick,
  onHover,
}, ref) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      if (!extrasPath || !isImageExtra(extra)) {
        setPreviewUrl('');
        return;
      }

      const assetUrl = await getAssetUrl(buildExtraAbsolutePath(extrasPath, extra.path));
      if (!cancelled) {
        setPreviewUrl(assetUrl);
      }
    }

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [extra, extrasPath]);

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseEnter={onHover}
      className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition-all ${
        selected
          ? 'border-yellow-300 bg-white/10 shadow-[0_0_0_2px_rgba(250,204,21,0.7),0_20px_40px_rgba(0,0,0,0.35)]'
          : 'border-[#2a475e]/70 bg-[#1a2430] hover:border-[#66c0f4]/50 hover:bg-[#223041]'
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#0b141d]">
        {previewUrl ? (
          <ImageWithFallback
            src={previewUrl}
            alt={extra.name}
            fit="cover"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            fallbackText={extra.name}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#24384b,transparent_70%)] text-4xl">
            {isVideoExtra(extra) ? '🎬' : '🖼'}
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-black/75 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-white">
          {isVideoExtra(extra) ? 'Media' : 'Artwork'}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{extra.name}</p>
          <p className="truncate text-[11px] uppercase tracking-[0.22em] text-[#8f98a0]">{getExtraSourceLabel(extra)}</p>
        </div>
        <span className="text-xs uppercase tracking-[0.22em] text-[#66c0f4]">View</span>
      </div>
    </button>
  );
});

const SteamLaunchableExtraCard = forwardRef<HTMLButtonElement, {
  extra: Extra;
  selected: boolean;
  onClick: () => void;
  onHover: () => void;
}>(function SteamLaunchableExtraCard({
  extra,
  selected,
  onClick,
  onHover,
}, ref) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseEnter={onHover}
      className={`group grid min-h-[96px] grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-all ${
        selected
          ? 'border-yellow-300 bg-emerald-500/10 shadow-[0_0_0_2px_rgba(250,204,21,0.7),0_18px_40px_rgba(0,0,0,0.3)]'
          : 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-400/45 hover:bg-emerald-500/10'
      }`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-xl text-emerald-300">
        ▶
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold leading-tight text-white">{extra.name}</p>
        <p className="mt-1 break-words text-[11px] uppercase tracking-[0.2em] text-emerald-200/75">
          {getExtraSourceLabel(extra)} • {getLaunchLabel(extra)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">A / Enter</p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Launch</p>
      </div>
    </button>
  );
});
