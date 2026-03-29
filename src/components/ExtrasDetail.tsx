"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Game, Extra } from '../types/game';
import { groupExtras, ExtraGroup } from '../lib/extras';
import { useSettings } from '../contexts/SettingsContext';
import { getAssetUrl, openFile, launchEmulator } from '../lib/tauri-bridge';
import type { DetailLayoutSpec } from '../lib/detail-layout';
import { ImageWithFallback } from './ImageWithFallback';
import { useGamepad } from '../hooks/useGamepad';
import { usePopupOpenSound } from '../hooks/usePopupOpenSound';

const VIDEO_EXTENSIONS = new Set(['avi', 'mp4', 'mov', 'mkv', 'webm']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'flac', 'sid']);

interface ExtrasDetailProps {
  game: Game;
  extras: Extra[];
  visibleCategories?: ExtraGroup['category'][];
  hideEmptyState?: boolean;
  enableBigscreenGalleryUX?: boolean;
  layoutSpec?: DetailLayoutSpec;
  onRegisterBigscreenNavigation?: (navigation: ExtrasBigscreenNavigation | null) => void;
}

export interface ExtrasBigscreenNavigation {
  move: (direction: 'left' | 'right' | 'up' | 'down') => boolean;
  activate: () => boolean;
}

export function ExtrasDetail({
  game,
  extras,
  visibleCategories,
  hideEmptyState = false,
  enableBigscreenGalleryUX = false,
  layoutSpec,
  onRegisterBigscreenNavigation,
}: ExtrasDetailProps) {
  const { markAsPlayed, settings } = useSettings();
  const [groupedExtras, setGroupedExtras] = useState<ExtraGroup[]>([]);
  const [launchStatus, setLaunchStatus] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const visualNavigationRef = useRef<ExtrasBigscreenNavigation | null>(null);

  useEffect(() => {
    setGroupedExtras(groupExtras(extras));
  }, [extras]);

  const visibleGroups = visibleCategories
    ? groupedExtras.filter((group) => visibleCategories.includes(group.category))
    : groupedExtras;

  const visualGroupItems = visibleGroups.find((group) => group.category === 'visual')?.items ?? [];
  const mediaGroupItems = visibleGroups.find((group) => group.category === 'media')?.items ?? [];
  const videoMediaExtras = mediaGroupItems.filter(isVideoExtra);
  const nonVideoMediaExtras = mediaGroupItems.filter((item) => !isVideoExtra(item));
  const galleryExtras = [...visualGroupItems, ...videoMediaExtras];

  const handleLaunchExtra = async (extra: Extra) => {
    const isRetroarch = settings.preferredEmulator === 'retroarch';
    const emulatorPath = isRetroarch ? settings.retroarchPath : settings.emulatorPath;

    if (!emulatorPath) {
      setLaunchStatus("Error: Emulator path not configured in Settings.");
      return;
    }

    setLaunchStatus(`Launching ${extra.name}...`);
    try {
      // Path construction: normalize all slashes to forward slashes for internal logic
      const cleanExtrasPath = (settings.extrasPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
      const cleanExtraPath = extra.path.replace(/\\/g, '/').replace(/^\/+/, '');
      const fullRomPath = [cleanExtrasPath, cleanExtraPath].join('/');
      
      const result = await launchEmulator({
        emulator_path: emulatorPath,
        rom_path: fullRomPath,
        true_drive_emulation: game.trueDriveEmu ?? false,
        is_pal: game.isPal ?? true,
        game_id: game.id.toString(),
        core_path: isRetroarch ? settings.retroarchCorePath : undefined,
      });

      if (!result.success) {
        setLaunchStatus(`Error: ${result.message}`);
      } else {
          markAsPlayed(game.id.toString());
          setLaunchStatus(null);
      }
    } catch (err) {
      setLaunchStatus(`Error: ${String(err)}`);
    }
    setTimeout(() => setLaunchStatus(null), 5000);
  };

  const handleOpenDoc = async (extra: Extra) => {
    const cleanExtrasPath = (settings.extrasPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
    const cleanExtraPath = extra.path.replace(/\\/g, '/').replace(/^\/+/, '');
    const fullPath = [cleanExtrasPath, cleanExtraPath].join('/');
    await openFile(fullPath);
  };

  useEffect(() => {
    if (!enableBigscreenGalleryUX || !onRegisterBigscreenNavigation) {
      return undefined;
    }

    const navigation: ExtrasBigscreenNavigation = {
      move: (direction) => {
        if (direction === 'left' || direction === 'right') {
          return visualNavigationRef.current?.move(direction) ?? false;
        }
        return false;
      },
      activate: () => visualNavigationRef.current?.activate() ?? false,
    };

    onRegisterBigscreenNavigation(navigation);
    return () => onRegisterBigscreenNavigation(null);
  }, [enableBigscreenGalleryUX, onRegisterBigscreenNavigation]);

  if (extras.length === 0 || visibleGroups.length === 0) {
    if (hideEmptyState) return null;
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 opacity-50">
        <span className="text-4xl mb-4">🗂️</span>
        <p className="text-sm font-medium">No additional extras available for this title.</p>
      </div>
    );
  }

  if (enableBigscreenGalleryUX && layoutSpec) {
    const docsExtras = (visibleGroups.find((group) => group.category === 'docs')?.items ?? []).slice(0, layoutSpec.extrasDocSlots);
    const mediaExtras = nonVideoMediaExtras.slice(0, layoutSpec.extrasMediaSlots);

    return (
      <div ref={scrollContainerRef} className="grid h-full min-h-0 min-w-0" style={{ gap: layoutSpec.panelInnerGap, gridTemplateRows: 'minmax(0,1fr) auto auto' }}>
        {launchStatus && (
          <div className="fixed bottom-8 right-8 z-[110] rounded-full border border-blue-500 bg-blue-900/90 px-6 py-3 text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300">
            {launchStatus}
          </div>
        )}

        {galleryExtras.length > 0 ? (
          <div className="min-h-0">
            <VisualExtrasBrowser
              extras={galleryExtras}
              extrasPath={settings.extrasPath}
              previewHeight={layoutSpec.extrasPreviewHeight}
              thumbColumns={layoutSpec.extrasThumbColumns}
              thumbnailLimit={layoutSpec.extrasThumbColumns}
              onRegisterNavigation={(navigation) => {
                visualNavigationRef.current = navigation;
              }}
            />
          </div>
        ) : (
          <div className="flex min-h-0 items-center justify-center rounded-[18px] border border-white/8 bg-black/20 text-sm text-gray-400">
            No gallery or media artwork available for this title.
          </div>
        )}

        {docsExtras.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">Documents & Manuals</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-gray-700/50 to-transparent"></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {docsExtras.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleOpenDoc(item)}
                  className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/40 p-3 text-left transition-all hover:border-gray-600 hover:bg-gray-800/60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-950/30 text-red-400">
                    {item.path.toLowerCase().endsWith('.pdf') ? '📄' : '📝'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{item.name}</div>
                    <div className="truncate text-[10px] uppercase tracking-wider text-gray-500">{item.path.split(/[\/\\]/).shift()}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : <div />}

        {mediaExtras.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">Media Assets</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-gray-700/50 to-transparent"></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {mediaExtras.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleOpenDoc(item)}
                  className="flex items-center gap-3 rounded-xl border border-purple-900/30 bg-purple-950/20 p-3 text-left transition-all hover:border-purple-500/50 hover:bg-purple-900/40"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400">
                    {item.path.toLowerCase().endsWith('.mp3') ? '🎵' : '🎬'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{item.name}</div>
                    <div className="truncate text-[10px] uppercase tracking-wider text-purple-300/55">Asset file</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : <div />}
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="space-y-8 animate-in fade-in duration-500 pb-12">
      {launchStatus && (
        <div className="fixed bottom-8 right-8 z-[110] bg-blue-900/90 border border-blue-500 text-white px-6 py-3 rounded-full shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300">
          {launchStatus}
        </div>
      )}

      {visibleGroups.map(group => (
        <div key={group.category} className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-white font-bold text-xs uppercase tracking-[0.2em] opacity-80">{group.label}</h3>
            <div className="h-px flex-1 bg-gradient-to-r from-gray-700/50 to-transparent"></div>
          </div>

          {group.category === 'visual' && (
            enableBigscreenGalleryUX ? (
              <VisualExtrasBrowser
                extras={galleryExtras}
                extrasPath={settings.extrasPath}
                onRegisterNavigation={(navigation) => {
                  visualNavigationRef.current = navigation;
                }}
              />
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {group.items.map((item, index) => (
                  <VisualExtraCard
                    key={item.id}
                    extra={item}
                    extrasPath={settings.extrasPath}
                    extraIndex={index}
                    enableCarousel={false}
                    visualExtras={group.items}
                  />
                ))}
              </div>
            )
          )}

          {group.category === 'docs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleOpenDoc(item)}
                  className="flex items-center gap-4 p-4 bg-gray-900/40 border border-gray-800 rounded-xl hover:bg-gray-800/60 hover:border-gray-600 transition-all text-left group"
                >
                  <div className="w-10 h-10 flex-shrink-0 bg-red-950/30 border border-red-500/20 rounded-lg flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                    {item.path.toLowerCase().endsWith('.pdf') ? '📄' : '📝'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">{item.name}</div>
                    <div className="text-gray-500 text-[10px] uppercase tracking-wider truncate">{item.path.split(/[\/\\]/).shift()}</div>
                  </div>
                  <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">Open ↗</span>
                </button>
              ))}
            </div>
          )}

          {group.category === 'games' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleLaunchExtra(item)}
                  className="flex items-center gap-4 p-4 bg-blue-950/20 border border-blue-900/30 rounded-xl hover:bg-blue-900/40 hover:border-blue-500/50 transition-all text-left group"
                >
                  <div className="w-10 h-10 flex-shrink-0 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                    🕹️
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">{item.name}</div>
                    <div className="text-blue-400/60 text-[10px] uppercase tracking-wider truncate">Load from {item.path.split(/[\/\\]/).shift()}</div>
                  </div>
                  <span className="text-green-400 font-bold text-[10px] tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">Launch</span>
                </button>
              ))}
            </div>
          )}

          {group.category === 'media' && (enableBigscreenGalleryUX ? nonVideoMediaExtras.length > 0 : group.items.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               {(enableBigscreenGalleryUX ? nonVideoMediaExtras : group.items).map(item => (
                <button
                  key={item.id}
                  onClick={() => handleOpenDoc(item)}
                  className="flex items-center gap-4 p-4 bg-purple-950/20 border border-purple-900/30 rounded-xl hover:bg-purple-900/40 hover:border-purple-500/50 transition-all text-left group"
                >
                  <div className="w-10 h-10 flex-shrink-0 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                    {isAudioExtra(item) ? '🎵' : '🎬'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">{item.name}</div>
                    <div className="text-purple-400/60 text-[10px] uppercase tracking-wider truncate">{isAudioExtra(item) ? 'Audio file' : 'Video file'}</div>
                  </div>
                   <span className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">{isAudioExtra(item) ? 'Play ↗' : 'Open ↗'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function VisualExtraCard({
  extra,
  extrasPath,
  extraIndex,
  enableCarousel,
  visualExtras,
}: {
  extra: Extra;
  extrasPath: string;
  extraIndex: number;
  enableCarousel: boolean;
  visualExtras: Extra[];
}) {
  const [url, setUrl] = useState<string>('');
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const currentExtra = fullscreenIndex !== null ? (visualExtras[fullscreenIndex] ?? extra) : extra;
  const isFullscreen = fullscreenIndex !== null;
  usePopupOpenSound(isFullscreen, 'extras-visual-fullscreen');

  useEffect(() => {
    const cleanExtrasPath = (extrasPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
    const cleanExtraPath = currentExtra.path.replace(/\\/g, '/').replace(/^\/+/, '');
    const fullPath = [cleanExtrasPath, cleanExtraPath].join('/');
    getAssetUrl(fullPath).then(setUrl);
  }, [currentExtra.path, extrasPath]);

  const cycleFullscreen = useCallback((direction: -1 | 1) => {
    if (!enableCarousel || visualExtras.length <= 1) {
      return;
    }

    setFullscreenIndex((previous) => {
      const baseIndex = previous ?? extraIndex;
      return (baseIndex + direction + visualExtras.length) % visualExtras.length;
    });
  }, [enableCarousel, extraIndex, visualExtras.length]);

  useGamepad({
    onButtonDown: (button) => {
      if (!isFullscreen) {
        return;
      }

      if (button === 'B') {
        setFullscreenIndex(null);
        return;
      }

      if (button === 'LEFT' || button === 'DPAD_LEFT') {
        cycleFullscreen(-1);
        return;
      }

      if (button === 'RIGHT' || button === 'DPAD_RIGHT') {
        cycleFullscreen(1);
      }
    },
  });

  useEffect(() => {
    if (!isFullscreen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        cycleFullscreen(-1);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        cycleFullscreen(1);
        return;
      }

      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault();
        setFullscreenIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cycleFullscreen, isFullscreen]);

  return (
    <>
      <div 
        className="group relative aspect-[4/3] bg-gray-950 rounded-xl overflow-hidden border border-gray-800 hover:border-blue-500/50 transition-all cursor-zoom-in shadow-lg"
        onClick={() => setFullscreenIndex(extraIndex)}
      >
        <ImageWithFallback
          src={url}
          alt={extra.name}
          fit="contain"
          className="w-full h-full bg-black/60 p-3 transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
          <p className="text-white font-bold text-xs truncate">{extra.name}</p>
          <p className="text-gray-400 text-[9px] uppercase tracking-widest">{extra.path.split(/[\/\\]/).shift()}</p>
        </div>
      </div>

      {isFullscreen && (
        <div 
          className="fixed inset-0 z-[120] bg-black/98 p-8 flex items-center justify-center backdrop-blur-xl animate-in fade-in zoom-in duration-300 pointer-events-auto"
          onClick={() => setFullscreenIndex(null)}
        >
          <div className="relative max-w-5xl w-full max-h-full flex flex-col items-center gap-4">
             {enableCarousel && visualExtras.length > 1 ? (
               <button
                 className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/60 px-4 py-5 text-3xl text-white transition-colors hover:border-blue-400/60 hover:text-blue-300"
                 onClick={() => cycleFullscreen(-1)}
               >
                 ‹
               </button>
             ) : null}
             <ImageWithFallback
                src={url}
                alt={currentExtra.name}
                fit="contain"
                className="max-w-full max-h-[85vh] shadow-2xl rounded-lg"
             />
             {enableCarousel && visualExtras.length > 1 ? (
               <button
                 className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/60 px-4 py-5 text-3xl text-white transition-colors hover:border-blue-400/60 hover:text-blue-300"
                 onClick={() => cycleFullscreen(1)}
               >
                 ›
               </button>
             ) : null}
             <div className="text-center">
                <h2 className="text-white font-bold text-xl">{currentExtra.name}</h2>
                <p className="text-gray-400 text-sm uppercase tracking-widest">{currentExtra.path}</p>
                {enableCarousel ? (
                  <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/50">Left / Right to browse • B / Esc to close</p>
                ) : null}
             </div>
             <button 
               className="absolute top-0 right-0 p-4 text-white hover:text-red-400 text-4xl leading-none"
               onClick={() => setFullscreenIndex(null)}
             >
               ×
             </button>
          </div>
        </div>
      )}
    </>
  );
}

function buildExtraAssetPath(extrasPath: string, extraPath: string) {
  const cleanExtrasPath = (extrasPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
  const cleanExtraPath = extraPath.replace(/\\/g, '/').replace(/^\/+/, '');
  return [cleanExtrasPath, cleanExtraPath].join('/');
}

function VisualExtrasBrowser({
  extras,
  extrasPath,
  previewHeight,
  thumbColumns = 5,
  thumbnailLimit,
  onRegisterNavigation,
}: {
  extras: Extra[];
  extrasPath: string;
  previewHeight?: number;
  thumbColumns?: number;
  thumbnailLimit?: number;
  onRegisterNavigation?: (navigation: ExtrasBigscreenNavigation | null) => void;
}) {
  const visibleExtras = thumbnailLimit ? extras.slice(0, thumbnailLimit) : extras;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const safeSelectedIndex = Math.min(selectedIndex, Math.max(visibleExtras.length - 1, 0));
  const selectedExtra = visibleExtras[safeSelectedIndex] ?? visibleExtras[0] ?? null;
  const fullscreenExtra = fullscreenIndex !== null ? (visibleExtras[fullscreenIndex] ?? selectedExtra) : null;
  const isFullscreen = fullscreenIndex !== null;
  usePopupOpenSound(isFullscreen, 'extras-visual-fullscreen');

  const moveSelection = useCallback((direction: -1 | 1) => {
    if (visibleExtras.length <= 1) {
      return;
    }

    setSelectedIndex((current) => (current + direction + visibleExtras.length) % visibleExtras.length);
  }, [visibleExtras.length]);

  const cycleFullscreen = useCallback((direction: -1 | 1) => {
    if (visibleExtras.length <= 1) {
      return;
    }

    setFullscreenIndex((current) => {
      const baseIndex = current ?? safeSelectedIndex;
      return (baseIndex + direction + visibleExtras.length) % visibleExtras.length;
    });
  }, [safeSelectedIndex, visibleExtras.length]);

  const moveWithinBrowser = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (isFullscreen) {
      if (direction === 'left') {
        cycleFullscreen(-1);
        return true;
      }
      if (direction === 'right') {
        cycleFullscreen(1);
        return true;
      }
      return false;
    }

    if (direction === 'left') {
      moveSelection(-1);
      return true;
    }
    if (direction === 'right') {
      moveSelection(1);
      return true;
    }
    return false;
  }, [cycleFullscreen, isFullscreen, moveSelection]);

  const activateSelection = useCallback(() => {
    if (isFullscreen) {
      return true;
    }

    if (!selectedExtra) {
      return false;
    }

    setFullscreenIndex(safeSelectedIndex);
    return true;
  }, [isFullscreen, safeSelectedIndex, selectedExtra]);

  useEffect(() => {
    if (!onRegisterNavigation) {
      return undefined;
    }

    onRegisterNavigation({
      move: moveWithinBrowser,
      activate: activateSelection,
    });

    return () => onRegisterNavigation(null);
  }, [activateSelection, moveWithinBrowser, onRegisterNavigation]);

  useGamepad({
    onButtonDown: (button) => {
      if (!isFullscreen) {
        return;
      }

      if (button === 'B') {
        setFullscreenIndex(null);
        return;
      }

      if (button === 'LEFT' || button === 'DPAD_LEFT') {
        cycleFullscreen(-1);
        return;
      }

      if (button === 'RIGHT' || button === 'DPAD_RIGHT') {
        cycleFullscreen(1);
      }
    },
  });

  useEffect(() => {
    if (!isFullscreen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        cycleFullscreen(-1);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        cycleFullscreen(1);
        return;
      }

      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault();
        setFullscreenIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cycleFullscreen, isFullscreen]);

  if (!selectedExtra) {
    return null;
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="rounded-[18px] border border-white/8 bg-black/20 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{selectedExtra.name}</div>
            <div className="truncate text-[10px] uppercase tracking-[0.2em] text-white/45">
              {selectedExtra.path.split(/[\/\\]/).shift()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => moveSelection(-1)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/70 transition-colors hover:border-cyan-400/40 hover:text-cyan-300"
              aria-label="Previous extra image"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => moveSelection(1)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/70 transition-colors hover:border-cyan-400/40 hover:text-cyan-300"
              aria-label="Next extra image"
            >
              ›
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setFullscreenIndex(safeSelectedIndex)}
          className="group relative block w-full overflow-hidden rounded-xl border border-gray-800 bg-gray-950 text-left transition-colors hover:border-blue-500/50"
          style={previewHeight ? { height: `${previewHeight}px` } : undefined}
        >
          <ResolvedExtraMedia
            extra={selectedExtra}
            extrasPath={extrasPath}
            fit="contain"
            mode="preview"
            className="h-full w-full bg-black/60 p-3"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent px-4 py-3 opacity-0 transition-opacity group-hover:opacity-100">
            <p className="truncate text-xs font-bold text-white">{selectedExtra.name}</p>
            <p className="text-[9px] uppercase tracking-widest text-gray-400">Press Enter for fullscreen</p>
          </div>
        </button>
      </div>

      <div className="grid min-w-0 gap-2.5" style={{ gridTemplateColumns: `repeat(${thumbColumns}, minmax(0,1fr))` }}>
        {visibleExtras.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className={`rounded-[16px] border p-2 text-left transition-all ${
              selectedIndex === index ? 'border-cyan-400/70 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(34,211,238,0.15)_inset]' : 'border-white/8 bg-white/[0.02] hover:border-white/20'
            }`}
          >
            <div className="overflow-hidden rounded-[12px] border border-white/8 bg-black/40">
              <VisualExtraThumb extra={item} extrasPath={extrasPath} />
            </div>
            <div className="mt-1.5 truncate text-[11px] font-medium text-white">{item.name}</div>
          </button>
        ))}
      </div>

      {isFullscreen && fullscreenExtra ? (
        <div
          data-detail-modal="open"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/98 p-8 backdrop-blur-xl animate-in fade-in zoom-in duration-300 pointer-events-auto"
          onClick={() => setFullscreenIndex(null)}
        >
          <div className="relative flex max-h-full w-full max-w-5xl flex-col items-center gap-4" onClick={(event) => event.stopPropagation()}>
            {visibleExtras.length > 1 ? (
              <button
                className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/60 px-4 py-5 text-3xl text-white transition-colors hover:border-blue-400/60 hover:text-blue-300"
                onClick={() => cycleFullscreen(-1)}
              >
                ‹
              </button>
            ) : null}
            <ResolvedExtraMedia
              extra={fullscreenExtra}
              extrasPath={extrasPath}
              fit="contain"
              mode="fullscreen"
              className="max-h-[85vh] max-w-full rounded-lg shadow-2xl"
            />
            {visibleExtras.length > 1 ? (
              <button
                className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/60 px-4 py-5 text-3xl text-white transition-colors hover:border-blue-400/60 hover:text-blue-300"
                onClick={() => cycleFullscreen(1)}
              >
                ›
              </button>
            ) : null}
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">{fullscreenExtra.name}</h2>
              <p className="text-sm uppercase tracking-widest text-gray-400">{fullscreenExtra.path}</p>
              {visibleExtras.length > 1 ? (
                <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/50">Left / Right to browse • B / Esc to close</p>
              ) : null}
            </div>
            <button
              className="absolute top-0 right-0 p-4 text-4xl leading-none text-white hover:text-red-400"
              onClick={() => setFullscreenIndex(null)}
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VisualExtraThumb({
  extra,
  extrasPath,
}: {
  extra: Extra;
  extrasPath: string;
}) {
  return (
    <ResolvedExtraMedia
      extra={extra}
      extrasPath={extrasPath}
      fit="contain"
      mode="thumbnail"
      className="aspect-[4/3] w-full bg-black/70 p-2"
    />
  );
}

function isVideoExtra(extra: Extra) {
  const extension = extra.path.split('.').pop()?.toLowerCase() ?? '';
  return VIDEO_EXTENSIONS.has(extension) || extra.type.toLowerCase() === 'video';
}

function isAudioExtra(extra: Extra) {
  const extension = extra.path.split('.').pop()?.toLowerCase() ?? '';
  return AUDIO_EXTENSIONS.has(extension);
}

function ResolvedExtraMedia({
  extra,
  extrasPath,
  fit = 'contain',
  mode = 'preview',
  className,
}: {
  extra: Extra;
  extrasPath: string;
  fit?: 'cover' | 'contain';
  mode?: 'preview' | 'thumbnail' | 'fullscreen';
  className: string;
}) {
  const [url, setUrl] = useState('');
  const [videoFailedPath, setVideoFailedPath] = useState<string | null>(null);
  const isVideo = isVideoExtra(extra);
  const videoFailed = videoFailedPath === extra.path;

  useEffect(() => {
    getAssetUrl(buildExtraAssetPath(extrasPath, extra.path)).then(setUrl);
  }, [extra.path, extrasPath]);

  if (isVideo && url && !videoFailed) {
    const showControls = mode === 'fullscreen';
    const autoPlay = mode !== 'fullscreen';

    return (
      <div className={`relative ${className}`}>
        <video
          src={url}
          className="h-full w-full object-contain object-center"
          controls={showControls}
          autoPlay={autoPlay}
          muted={!showControls}
          loop
          playsInline
          preload="metadata"
          onError={() => setVideoFailedPath(extra.path)}
        />
        {mode !== 'fullscreen' ? (
          <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-cyan-400/35 bg-black/60 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">
            Video
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <ImageWithFallback
      src={url}
      alt={extra.name}
      fit={fit}
      className={className}
    />
  );
}
