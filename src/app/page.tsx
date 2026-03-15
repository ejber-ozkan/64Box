"use client";

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { exitApp, getGenres } from '@/lib/tauri-bridge';
import { useSettings } from '@/contexts/SettingsContext';
import { GridView } from '@/components/GridView';
import { ListView } from '@/components/ListView';
import { DetailView } from '@/components/DetailView';
import { SettingsView } from '@/components/SettingsModal';
import { AlphabetJumpBar } from '@/components/AlphabetJumpBar';
import { useInputMode } from '@/hooks/useInputMode';
import { BigBoxView } from '@/components/BigBoxView';
import { useFavorites } from '@/hooks/useFavorites';
import { useLibraryBrowserState } from '@/hooks/useLibraryBrowserState';
import { useLibraryShellInput } from '@/hooks/useLibraryShellInput';
import { LibraryHeader } from '@/components/library/LibraryHeader';
import { WindowGameShelf } from '@/components/library/WindowGameShelf';
import { WindowGameListSection } from '@/components/library/WindowGameListSection';
import { AppLaunchSplash } from '@/components/AppLaunchSplash';
import { useWindowLibraryShelves } from '@/hooks/useWindowLibraryShelves';
import {
  playRotatingUiSoundEffectAndWait,
  playUiSoundEffect,
  playUiSoundEffectAndWait,
} from '@/lib/ui-sound-effects';

export default function Home() {
  const { settings, updateSettings } = useSettings();
  const { favorites, isFavorite } = useFavorites();
  const { isMouseMode, onGamepadInput, showMouse } = useInputMode();
  const {
    closeDetail,
    effectiveFilters: filters,
    focusedIndex,
    games,
    handleGameSelect,
    handleSort,
    mounted,
    openTigerHeliFromSettings,
    persistWindowSize,
    searchInput,
    selectedGame,
    setFilters,
    setFocusedIndex,
    setSearchInput,
    setViewMode,
    shelfRef,
    toggleFocusedFavorite,
    viewMode,
  } = useLibraryBrowserState();
  const [genres, setGenres] = useState<string[]>([]);
  const [showLaunchSplash, setShowLaunchSplash] = useState(true);
  const previousFullscreenRef = useRef(settings.isFullscreen);
  const { classicGames, favoriteGames, recentGames } = useWindowLibraryShelves({
    favoriteIds: favorites,
    filters,
    recentlyPlayedIds: settings.recentlyPlayedIds,
    searchInput,
  });

  useEffect(() => {
    void getGenres().then(setGenres);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setShowLaunchSplash(false);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (previousFullscreenRef.current && !settings.isFullscreen) {
      void playUiSoundEffect('bigbox-switch', 0.55);
    }

    previousFullscreenRef.current = settings.isFullscreen;
  }, [settings.isFullscreen]);

  useLibraryShellInput({
    closeDetail,
    filters,
    focusedIndex,
    games,
    handleGameSelect,
    onGamepadInput,
    persistWindowSize,
    selectedGame,
    setFilters,
    setFocusedIndex,
    setSearchInput,
    setViewMode,
    settings: {
      isFullscreen: settings.isFullscreen,
      recentlyPlayedIds: settings.recentlyPlayedIds,
      scrollNavigation: settings.scrollNavigation,
    },
    toggleFocusedFavorite,
    updateSettings,
    viewMode,
  });

  const handleBackFromSettings = async () => {
    await playUiSoundEffectAndWait('close-detail-1', 0.52);
    setViewMode('grid');
  };

  const handleBackFromDetail = async () => {
    await playUiSoundEffectAndWait('close-detail-1', 0.52);
    closeDetail();
  };

  if (viewMode === 'settings') {
    return (
      <>
        {showLaunchSplash ? <AppLaunchSplash /> : null}
        <main className="min-h-screen bg-gray-950 text-white font-sans selection:bg-blue-600/50 flex flex-col">
          <SettingsView onBack={handleBackFromSettings} onOpenTigerHeli={openTigerHeliFromSettings} />
        </main>
      </>
    )
  }



  if (selectedGame) {
    return (
      <>
        {showLaunchSplash ? <AppLaunchSplash /> : null}
        <main className="min-h-screen bg-gray-900 text-white font-sans selection:bg-blue-600/50">
          <DetailView game={selectedGame} onBack={handleBackFromDetail} />
        </main>
      </>
    );
  }

  if (settings.isFullscreen) {
    return (
      <>
        {showLaunchSplash ? <AppLaunchSplash /> : null}
        <BigBoxView 
          settings={settings}
          onSelectGame={handleGameSelect}
          onRequestExit={({ dontAskAgain, focusedGameId, railId }) => {
            flushSync(() => {
              updateSettings({
                confirmFullscreenExit: !dontAskAgain,
                lastBigBoxGameId: focusedGameId,
                lastBigBoxRailId: railId,
              });
            });
            void (async () => {
              await playRotatingUiSoundEffectAndWait('bigbox-close', [
                'close-app-1',
                'close-app-2',
                'close-app-3',
                'close-app-4',
              ], 0.7);
              void exitApp();
            })();
          }}
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          onShowSettings={() => setViewMode('settings')}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </>
    );
  }

  return (
    <>
      {showLaunchSplash ? <AppLaunchSplash /> : null}
      <main className={`h-screen overflow-hidden bg-gray-900 text-white flex flex-col font-sans transition-all ${
        settings.isFullscreen && !showMouse ? 'cursor-none' : ''
      }`}>
        <LibraryHeader
          filters={filters}
          genres={genres}
          onExit={exitApp}
          onFiltersChange={setFilters}
          onOpenSettings={() => setViewMode('settings')}
          onSearchChange={setSearchInput}
          onViewModeChange={setViewMode}
          searchInput={searchInput}
          viewMode={viewMode}
        />

        <div className="no-scrollbar flex-1 overflow-auto pl-8 pr-4">
          <AlphabetJumpBar 
            activeLetter={filters.letter} 
            onLetterSelect={(l) => {
              setFilters(prev => ({ ...prev, letter: prev.letter === l ? undefined : l, searchQuery: undefined }));
              setSearchInput(''); // Clear search box when browsing by letter
            }} 
          />
          
          {viewMode === 'grid' ? (
            <>
              {mounted && (
                <WindowGameShelf
                  games={recentGames}
                  isFavorite={isFavorite}
                  isMouseMode={isMouseMode}
                  onFocusChange={() => {}}
                  onSelectGame={handleGameSelect}
                  subtitle="Your latest launches, kept near the top for quick return trips."
                  shelfRef={shelfRef}
                  title="Recent Games"
                />
              )}

              <WindowGameShelf
                games={favoriteGames}
                isFavorite={isFavorite}
                isMouseMode={isMouseMode}
                onFocusChange={() => {}}
                onSelectGame={handleGameSelect}
                subtitle="Pinned titles from your personal shortlist."
                title="Your Favorites"
              />

              <WindowGameShelf
                games={classicGames}
                isFavorite={isFavorite}
                isMouseMode={isMouseMode}
                onFocusChange={() => {}}
                onSelectGame={handleGameSelect}
                subtitle="Essential GB64 staples surfaced in the windowed library too."
                title="🏆 Legendary Classics 🏆"
              />

              <GridView 
                games={games} 
                onSelectGame={handleGameSelect} 
                focusedIndex={focusedIndex >= 0 ? focusedIndex : -1} 
                onFocusChange={isMouseMode && settings.mouseHoverSelection ? setFocusedIndex : undefined}
              />
            </>
          ) : (
            <>
              {mounted && (
                <WindowGameListSection
                  games={recentGames}
                  isFavorite={isFavorite}
                  onSelectGame={handleGameSelect}
                  title="Recent Games"
                />
              )}
              <WindowGameListSection
                games={favoriteGames}
                isFavorite={isFavorite}
                onSelectGame={handleGameSelect}
                title="Your Favorites"
              />
              <WindowGameListSection
                games={classicGames}
                isFavorite={isFavorite}
                onSelectGame={handleGameSelect}
                title="🏆 Legendary Classics 🏆"
              />
              <ListView 
                games={games} 
                onSelectGame={handleGameSelect} 
                onSort={handleSort} 
                focusedIndex={focusedIndex >= 0 ? focusedIndex : -1}
                onFocusChange={isMouseMode && settings.mouseHoverSelection ? setFocusedIndex : undefined}
                isFavorite={isFavorite}
              />
            </>
          )}
        </div>
      </main>
    </>
  );
}
