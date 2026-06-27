"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  exitApp,
  getDatabaseBootstrapStatus,
  getGenres,
  getSubGenres,
  importDatabaseFromMdb,
  openMdbFileDialog,
} from '@/lib/tauri-bridge';
import { useSettings } from '@/contexts/SettingsContext';
import { GridView } from '@/components/GridView';
import { ListView } from '@/components/ListView';
import { DetailView } from '@/components/DetailView';
import { SettingsView } from '@/components/SettingsModal';
import { AlphabetJumpBar } from '@/components/AlphabetJumpBar';
import { useInputMode } from '@/hooks/useInputMode';
import { BigBoxView } from '@/components/BigBoxView';
import type { BigBoxSessionState } from '@/components/BigBoxView';
import { useFavorites } from '@/hooks/useFavorites';
import { useLibraryBrowserState } from '@/hooks/useLibraryBrowserState';
import { useLibraryShellInput } from '@/hooks/useLibraryShellInput';
import { LibraryHeader } from '@/components/library/LibraryHeader';
import { WindowGameShelf } from '@/components/library/WindowGameShelf';
import { WindowGameListSection } from '@/components/library/WindowGameListSection';
import { AppLaunchSplash } from '@/components/AppLaunchSplash';
import { DatabaseSetupView } from '@/components/setup/DatabaseSetupView';
import { useWindowLibraryShelves } from '@/hooks/useWindowLibraryShelves';
import { PLATFORM_PROFILES } from '@/lib/platform-capabilities';
import {
  playRotatingUiSoundEffectAndWait,
  playUiSoundEffect,
  playUiSoundEffectAndWait,
} from '@/lib/ui-sound-effects';

function LibraryApp() {
  const { settings, updateSettings, setActivePlatform } = useSettings();
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
  const [subGenres, setSubGenres] = useState<string[]>([]);
  const [showLaunchSplash, setShowLaunchSplash] = useState(true);
  const [bigBoxSession, setBigBoxSession] = useState<BigBoxSessionState | null>(null);
  const [platformSetupError, setPlatformSetupError] = useState<string | null>(null);
  const [platformSetupResult, setPlatformSetupResult] = useState<string | null>(null);
  const previousFullscreenRef = useRef(settings.isFullscreen);
  const { classicGames, favoriteGames, recentGames } = useWindowLibraryShelves({
    favoriteIds: favorites,
    filters,
    recentlyPlayedIds: settings.recentlyPlayedIds,
    searchInput,
  });
  const activePlatform = PLATFORM_PROFILES[settings.activePlatformId];
  const activePlatformSettings = settings.platformSettings[settings.activePlatformId];

  useEffect(() => {
    void getGenres().then(setGenres);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSubGenres() {
      const items = await getSubGenres(filters.genre);
      if (!cancelled) {
        setSubGenres(items);
      }
    }

    void loadSubGenres();

    return () => {
      cancelled = true;
    };
  }, [filters.genre]);

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

  const handleBrowsePlatformMdb = useCallback(async () => {
    const selected = await openMdbFileDialog();
    if (!selected) {
      return;
    }

    setPlatformSetupError(null);
    setPlatformSetupResult(`Selected MDB for ${activePlatform.displayName}.`);
    updateSettings({
      platformSettings: {
        ...settings.platformSettings,
        [settings.activePlatformId]: {
          ...activePlatformSettings,
          library: {
            ...activePlatformSettings.library,
            sourceMdbPath: selected,
          },
        },
      },
    });
  }, [
    activePlatform.displayName,
    activePlatformSettings,
    settings.activePlatformId,
    settings.platformSettings,
    updateSettings,
  ]);

  const handlePlatformImport = useCallback(() => {
    setPlatformSetupResult(null);
    setPlatformSetupError(
      `${activePlatform.displayName} MDB selection is ready. The next implementation slice adds platform-aware MDB export/import plus required Games, Music, Photos, and Screenshots folder fields.`,
    );
  }, [activePlatform.displayName]);

  if (activePlatformSettings.library.importStatus !== 'imported') {
    return (
      <>
        {showLaunchSplash ? <AppLaunchSplash /> : null}
        <DatabaseSetupView
          dbPath={activePlatformSettings.library.sqliteScope}
          error={platformSetupError ?? `${activePlatform.displayName} has not been imported yet.`}
          importResult={platformSetupResult}
          isImporting={false}
          mdbPath={activePlatformSettings.library.sourceMdbPath ?? ''}
          platformName={activePlatform.displayName}
          onBrowse={handleBrowsePlatformMdb}
          onImport={handlePlatformImport}
        />
      </>
    );
  }

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
          sessionState={bigBoxSession}
          onSessionChange={setBigBoxSession}
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
          onPlatformSelect={setActivePlatform}
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
          onPlatformSelect={setActivePlatform}
          onSearchChange={setSearchInput}
          subGenres={subGenres}
          onViewModeChange={setViewMode}
          searchInput={searchInput}
          activePlatformId={settings.activePlatformId}
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

export default function Home() {
  const [bootstrapStatus, setBootstrapStatus] = useState<{
    dbPath: string;
    ready: boolean;
    reason: string | null;
  } | null>(null);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [mdbPath, setMdbPath] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupSuccess, setSetupSuccess] = useState<string | null>(null);

  const refreshBootstrapStatus = useCallback(async () => {
    setIsCheckingSetup(true);
    try {
      const status = await getDatabaseBootstrapStatus();
      setBootstrapStatus({
        dbPath: status.dbPath,
        ready: status.ready,
        reason: status.reason ?? null,
      });
      if (status.ready) {
        setSetupError(null);
      }
    } catch (error) {
      setBootstrapStatus({
        dbPath: '',
        ready: false,
        reason: null,
      });
      setSetupError(error instanceof Error ? error.message : 'Unable to verify database setup.');
    } finally {
      setIsCheckingSetup(false);
    }
  }, []);

  useEffect(() => {
    void refreshBootstrapStatus();
  }, [refreshBootstrapStatus]);

  const handleBrowseMdb = useCallback(async () => {
    const selected = await openMdbFileDialog();
    if (selected) {
      setMdbPath(selected);
      setSetupError(null);
    }
  }, []);

  const handleImportDatabase = useCallback(async () => {
    if (!mdbPath) {
      setSetupError('Select the GameBase64 v19 MDB file first.');
      return;
    }

    setIsImporting(true);
    setSetupError(null);
    setSetupSuccess(null);

    try {
      const result = await importDatabaseFromMdb(mdbPath);
      setSetupSuccess(
        `Imported ${result.importedTables} tables and prepared the GB64 database at ${result.dbPath}.`,
      );
      await refreshBootstrapStatus();
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : 'Database import failed.');
    } finally {
      setIsImporting(false);
    }
  }, [mdbPath, refreshBootstrapStatus]);

  if (isCheckingSetup || bootstrapStatus === null) {
    return (
      <main className="min-h-screen bg-[#06080f] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-5">
            <div className="h-14 w-14 rounded-full border-4 border-cyan-400/15 border-t-cyan-300 animate-spin" />
            <div className="text-sm font-black uppercase tracking-[0.24em] text-cyan-200/75">
              Checking GB64 Database
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!bootstrapStatus.ready) {
    return (
      <DatabaseSetupView
        dbPath={bootstrapStatus.dbPath}
        error={setupError ?? bootstrapStatus.reason}
        importResult={setupSuccess}
        isImporting={isImporting}
        mdbPath={mdbPath}
        onBrowse={handleBrowseMdb}
        onImport={handleImportDatabase}
      />
    );
  }

  return <LibraryApp />;
}
