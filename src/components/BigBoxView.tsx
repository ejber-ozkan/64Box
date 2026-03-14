"use client";

import React, { useState } from 'react';
import { Game } from '../types/game';
import { Settings } from '../contexts/SettingsContext';
import { HorizontalRail } from './HorizontalRail';
import { exitApp } from '../lib/tauri-bridge';
import { useFavorites } from '../hooks/useFavorites';
import { useInputMode } from '../hooks/useInputMode';
import { GameFilters } from '../lib/tauri-bridge';
import { BigBoxHeader } from './bigbox/BigBoxHeader';
import { BigBoxAlphabetRail } from './bigbox/BigBoxAlphabetRail';
import { BigBoxFooter } from './bigbox/BigBoxFooter';
import { useBigBoxLibraryData } from '../hooks/useBigBoxLibraryData';
import { useBigBoxNavigation } from '../hooks/useBigBoxNavigation';
import { useBigBoxScrollSync } from '../hooks/useBigBoxScrollSync';

interface BigBoxViewProps {
  settings: Settings;
  onSelectGame: (game: Game) => void;
  onBack?: () => void;
  searchInput: string;
  onSearchChange: (val: string) => void;
  onShowSettings: () => void;
  filters: GameFilters;
  onFiltersChange: (f: GameFilters) => void;
}

export function BigBoxView({
  settings,
  onSelectGame,
  onBack,
  searchInput,
  onSearchChange,
  onShowSettings,
  filters,
  onFiltersChange,
}: BigBoxViewProps) {
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { isMouseMode, onGamepadInput } = useInputMode();
  const [activeRailIndex, setActiveRailIndex] = useState(0);
  const [activeHeaderRow, setActiveHeaderRow] = useState(0);
  const [activeHeaderItemIndex, setActiveHeaderItemIndex] = useState(0);
  const [railFocusIndices, setRailFocusIndices] = useState<Record<string, number>>({});

  const { genres, loading, rails, totalGameCount } = useBigBoxLibraryData({
    activeRailIndex,
    favorites,
    filters,
    recentlyPlayedIds: settings.recentlyPlayedIds,
    searchInput,
  });
  const {
    currentFocusedIndex,
    currentRailId,
    currentRailType,
    focusHeader,
    focusRailItem,
    focusSearch,
    handleKeyDown,
    jumpToRail,
    sectionJumpDirection,
    setSectionJumpDirection,
  } = useBigBoxNavigation({
    activeHeaderItemIndex,
    activeHeaderRow,
    activeRailIndex,
    filters,
    genres,
    onBack,
    onFiltersChange,
    onFocusSearchInput: () => {
      const input = headerRef.current?.querySelector('input');
      if (input) {
        (input as HTMLElement).focus();
      }
    },
    onGamepadInput,
    onSelectGame,
    onShowSettings,
    railFocusIndices,
    rails,
    setActiveHeaderItemIndex,
    setActiveHeaderRow,
    setActiveRailIndex,
    setRailFocusIndices,
    toggleFavorite,
  });

  const { scrollContainerRef, headerRef } = useBigBoxScrollSync({
    activeRailIndex,
    currentFocusedIndex,
    currentRailId,
    currentRailType,
    onSectionJumpHandled: () => setSectionJumpDirection(null),
    sectionJumpDirection,
  });

  return (
    <div 
      className="fixed inset-0 bg-[#0a0a0f] text-white flex flex-col overflow-hidden select-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Cinematic Background Blur */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-blue-900/10 blur-[100px] animate-pulse"></div>
         <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-purple-900/10 blur-[100px]"></div>
      </div>

      {/* Top Bar - Fixed */}
      <header ref={headerRef}>
        <BigBoxHeader
          activeHeaderItemIndex={activeHeaderItemIndex}
          activeHeaderRow={activeHeaderRow}
          activeRailIndex={activeRailIndex}
          filters={filters}
          genres={genres}
          onExit={() => exitApp()}
          onFiltersChange={onFiltersChange}
          onJumpToRail={jumpToRail}
          onSearchChange={onSearchChange}
          onSearchFocus={focusSearch}
          onSetHeaderFocus={focusHeader}
          onShowSettings={onShowSettings}
          searchInput={searchInput}
        />
      </header>

      {/* Rails Container - wrapper clips any stubborn native scrollbar off-canvas */}
      <div className="z-10 flex-1 overflow-hidden">
        <main
          ref={scrollContainerRef}
          className="no-scrollbar h-full overflow-y-auto scroll-smooth pb-[100vh]"
          style={{
            width: 'calc(100% + 28px)',
            paddingRight: '28px',
            marginRight: '-28px',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {loading ? (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
               <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
               <div className="text-blue-400 font-bold uppercase tracking-widest animate-pulse">Scanning Library...</div>
            </div>
          ) : (
            rails.map((rail, idx) => {
              const isActive = idx === activeRailIndex;
              const focusedIdx = railFocusIndices[rail.id] || 0;

              if (rail.type === 'alphabet') {
                return (
                  <BigBoxAlphabetRail
                    key={rail.id}
                    focusedIdx={focusedIdx}
                    isActive={isActive}
                    isFavorite={isFavorite}
                    isMouseMode={isMouseMode}
                    onFocus={(gameIndex) => focusRailItem(idx, rail.id, gameIndex)}
                    onSelectGame={(gameId) => {
                      const game = rail.games.find((candidate) => candidate.id === gameId);
                      if (game) {
                        onSelectGame(game);
                      }
                    }}
                    rail={rail}
                  />
                );
              }

              return (
                <div key={rail.id} className="scroll-mt-[340px]">
                  <HorizontalRail
                    title={rail.title}
                    games={rail.games}
                    onSelectGame={onSelectGame}
                    focusedIndex={focusedIdx}
                    isActive={isActive}
                    isMouseFocusEnabled={isMouseMode}
                    onFocusChange={(fIdx) => focusRailItem(idx, rail.id, fIdx)}
                    isFavorite={isFavorite}
                    tileScale={rail.scale}
                    loop={rail.games.length > 6}
                  />
                </div>
              );
            })
          )}
        </main>
      </div>

      {/* Bottom Status Bar */}
      <BigBoxFooter totalGameCount={totalGameCount} />
    </div>
  );
}
