"use client";

import { exitApp } from '@/lib/tauri-bridge';
import { useSettings } from '@/contexts/SettingsContext';
import { GridView } from '@/components/GridView';
import { ListView } from '@/components/ListView';
import { DetailView } from '@/components/DetailView';
import { SettingsView } from '@/components/SettingsModal';
import { FilterDrawer } from '@/components/FilterDrawer';
import { AlphabetJumpBar } from '@/components/AlphabetJumpBar';
import { useInputMode } from '@/hooks/useInputMode';
import { BigBoxView } from '@/components/BigBoxView';
import { useFavorites } from '@/hooks/useFavorites';
import { useLibraryBrowserState } from '@/hooks/useLibraryBrowserState';
import { useLibraryShellInput } from '@/hooks/useLibraryShellInput';
import { LibraryHeader } from '@/components/library/LibraryHeader';
import { RecentlyPlayedShelf } from '@/components/library/RecentlyPlayedShelf';

export default function Home() {
  const { settings, updateSettings } = useSettings();
  const { isFavorite } = useFavorites();
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
    setShowFilters,
    setViewMode,
    shelfRef,
    showFilters,
    toggleFocusedFavorite,
    viewMode,
  } = useLibraryBrowserState();

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
    setShowFilters,
    setViewMode,
    settings: {
      isFullscreen: settings.isFullscreen,
      recentlyPlayedIds: settings.recentlyPlayedIds,
      scrollNavigation: settings.scrollNavigation,
    },
    showFilters,
    toggleFocusedFavorite,
    updateSettings,
    viewMode,
  });

  if (viewMode === 'settings') {
    return (
      <main className="min-h-screen bg-gray-950 text-white font-sans selection:bg-blue-600/50 flex flex-col">
        <SettingsView onBack={() => setViewMode('grid')} onOpenTigerHeli={openTigerHeliFromSettings} />
      </main>
    )
  }



  if (selectedGame) {
    return (
      <main className="min-h-screen bg-gray-900 text-white font-sans selection:bg-blue-600/50">
        <DetailView game={selectedGame} onBack={closeDetail} />
      </main>
    );
  }

  if (settings.isFullscreen) {
    return (
      <BigBoxView 
        settings={settings}
        onSelectGame={handleGameSelect}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        onShowSettings={() => setViewMode('settings')}
        onBack={() => updateSettings({ isFullscreen: false })}
        filters={filters}
        onFiltersChange={setFilters}
      />
    );
  }

  return (
    <main className={`h-screen overflow-hidden bg-gray-900 text-white flex flex-col font-sans transition-all ${
      settings.isFullscreen && !showMouse ? 'cursor-none' : ''
    }`}>
      <LibraryHeader
        filters={filters}
        onExit={exitApp}
        onOpenSettings={() => setViewMode('settings')}
        onSearchChange={setSearchInput}
        onShowFilters={() => setShowFilters(true)}
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
        
        {mounted && (
          <RecentlyPlayedShelf
            focusedIndex={focusedIndex}
            games={games}
            isFavorite={isFavorite}
            isMouseMode={isMouseMode}
            onFocusChange={setFocusedIndex}
            onSelectGame={handleGameSelect}
            recentIds={settings.recentlyPlayedIds}
            shelfRef={shelfRef}
          />
        )}

        {viewMode === 'grid' ? (
          <GridView 
            games={games} 
            onSelectGame={handleGameSelect} 
            focusedIndex={focusedIndex >= 0 ? focusedIndex : -1} 
            onFocusChange={isMouseMode && settings.mouseHoverSelection ? setFocusedIndex : undefined}
          />
        ) : (
          <ListView 
            games={games} 
            onSelectGame={handleGameSelect} 
            onSort={handleSort} 
            focusedIndex={focusedIndex >= 0 ? focusedIndex : -1}
            onFocusChange={isMouseMode && settings.mouseHoverSelection ? setFocusedIndex : undefined}
            isFavorite={isFavorite}
          />
        )}
      </div>

      <FilterDrawer 
        isOpen={showFilters} 
        onClose={() => setShowFilters(false)} 
        filters={filters} 
        onChange={(newFilters) => {
          setFilters(newFilters);
          if (newFilters.searchQuery === undefined) {
             setSearchInput('');
          }
        }} 
      />
    </main>
  );
}
