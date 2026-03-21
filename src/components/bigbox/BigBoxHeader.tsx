"use client";

import { BIGBOX_LETTERS } from '../../hooks/useBigBoxLibraryData';
import { GameFilters } from '../../lib/tauri-bridge';

interface BigBoxHeaderProps {
  activeHeaderItemIndex: number;
  activeHeaderRow: number;
  activeRailIndex: number;
  filters: GameFilters;
  genres: string[];
  hasOverflowSubGenres: boolean;
  onExit: () => void;
  onFiltersChange: (filters: GameFilters) => void;
  onOpenSubGenrePicker: () => void;
  onJumpToRail: (railId: string) => void;
  onSearchChange: (value: string) => void;
  onSearchFocus: () => void;
  onSetHeaderFocus: (row: number, index: number) => void;
  onShowSettings: () => void;
  searchInput: string;
  visibleSubGenres: string[];
}

export function BigBoxHeader({
  activeHeaderItemIndex,
  activeHeaderRow,
  activeRailIndex,
  filters,
  genres,
  hasOverflowSubGenres,
  onExit,
  onFiltersChange,
  onOpenSubGenrePicker,
  onJumpToRail,
  onSearchChange,
  onSearchFocus,
  onSetHeaderFocus,
  onShowSettings,
  searchInput,
  visibleSubGenres,
}: BigBoxHeaderProps) {
  const hasSubGenres = Boolean(filters.genre && (visibleSubGenres.length > 0 || hasOverflowSubGenres));
  const subGenreRowIndex = 2;
  const jumpRowIndex = hasSubGenres ? 3 : 2;

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[linear-gradient(180deg,rgba(7,11,18,0.96),rgba(10,10,15,0.82))] backdrop-blur-3xl flex flex-col shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
      <div className="px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 leading-none">
              64Box
            </h1>
            <div className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/40 ml-1">GB64 Frontend</div>
          </div>

          <div className="h-8 w-px bg-white/10 mx-4"></div>

          <div className={`relative group transition-all duration-300 ${activeRailIndex === -1 && activeHeaderRow === 0 && activeHeaderItemIndex === 0 ? 'scale-110 z-10' : ''}`}>
            <input
              type="text"
              placeholder="QUICK SEARCH"
              value={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
              onFocus={onSearchFocus}
              className={`bg-white/5 border text-xl font-bold rounded-full px-8 py-3 outline-none transition-all w-[350px] placeholder:text-white/20 ${
                activeRailIndex === -1 && activeHeaderRow === 0 && activeHeaderItemIndex === 0
                  ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-white/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-40 transition-opacity">🔍</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onShowSettings}
            onMouseEnter={() => onSetHeaderFocus(0, 1)}
            className={`w-11 h-11 flex items-center justify-center transition-all group rounded-full border ${
              activeRailIndex === -1 && activeHeaderRow === 0 && activeHeaderItemIndex === 1
                ? 'bg-blue-600 border-blue-400 text-white scale-110 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="Settings"
          >
            <span className={`text-xl transition-transform duration-500 ${activeRailIndex === -1 && activeHeaderRow === 0 && activeHeaderItemIndex === 1 ? 'rotate-45' : 'group-hover:rotate-45'}`}>⚙️</span>
          </button>

          <button
            onClick={onExit}
            onMouseEnter={() => onSetHeaderFocus(0, 2)}
            className={`w-11 h-11 flex items-center justify-center transition-all group rounded-full border ${
              activeRailIndex === -1 && activeHeaderRow === 0 && activeHeaderItemIndex === 2
                ? 'bg-red-600 border-red-400 text-white scale-110 shadow-[0_0_20px_rgba(220,38,38,0.5)]'
                : 'bg-red-600/20 border-red-500/30 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-400'
            }`}
            title="Exit Application"
          >
            <span className={`text-xl transition-transform ${activeRailIndex === -1 && activeHeaderRow === 0 && activeHeaderItemIndex === 2 ? 'scale-110' : 'group-hover:scale-110'}`}>⏻</span>
          </button>

          <div className="flex flex-col items-end opacity-60">
            <div className="text-xl font-black text-white tabular-nums">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      <div className="px-12 pb-4 flex items-center gap-2 overflow-x-hidden justify-center max-w-full">
        <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mr-4 shrink-0">Genre</div>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth flex-1 justify-center">
          {genres.map((genre, index) => {
            const isSelected = filters.genre === genre;
            const isFocused = activeRailIndex === -1 && activeHeaderRow === 1 && activeHeaderItemIndex === index;
            return (
              <button
                key={genre}
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    genre: filters.genre === genre ? undefined : genre,
                    subGenre: undefined,
                  })
                }
                onMouseEnter={() => onSetHeaderFocus(1, index)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all border ${
                  isFocused
                    ? 'bg-blue-600 border-blue-400 text-white scale-105 shadow-lg z-10'
                    : isSelected
                      ? 'bg-blue-900/40 border-blue-500/50 text-blue-400'
                      : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10'
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </div>

      {hasSubGenres ? (
        <div className="px-12 pb-4 flex items-center gap-2 overflow-x-hidden border-t border-white/5 pt-4 justify-center max-w-full">
        <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mr-4 shrink-0">Sub-Genre</div>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth flex-1 justify-center">
            {visibleSubGenres.map((subGenre, index) => {
              const isSelected = filters.subGenre === subGenre;
              const isFocused =
                activeRailIndex === -1 && activeHeaderRow === subGenreRowIndex && activeHeaderItemIndex === index;
              return (
                <button
                  key={subGenre}
                  onClick={() =>
                    onFiltersChange({
                      ...filters,
                      subGenre: filters.subGenre === subGenre ? undefined : subGenre,
                    })
                  }
                  onMouseEnter={() => onSetHeaderFocus(subGenreRowIndex, index)}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all border ${
                    isFocused
                      ? 'bg-cyan-600 border-cyan-400 text-white scale-105 shadow-lg z-10'
                      : isSelected
                        ? 'bg-cyan-900/40 border-cyan-500/50 text-cyan-300'
                        : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {subGenre}
                </button>
              );
            })}
            {hasOverflowSubGenres ? (
              <button
                type="button"
                onClick={onOpenSubGenrePicker}
                onMouseEnter={() => onSetHeaderFocus(subGenreRowIndex, visibleSubGenres.length)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all border ${
                  activeRailIndex === -1 &&
                  activeHeaderRow === subGenreRowIndex &&
                  activeHeaderItemIndex === visibleSubGenres.length
                    ? 'bg-cyan-600 border-cyan-400 text-white scale-105 shadow-lg z-10'
                    : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/16'
                }`}
              >
                More...
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="px-12 pb-6 flex items-center gap-2 overflow-x-hidden border-t border-white/5 pt-4 justify-center max-w-full">
        <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mr-4 shrink-0">Jump To</div>
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar scroll-smooth flex-1 justify-center">
          {BIGBOX_LETTERS.map((letter, index) => {
            const isFocused = activeRailIndex === -1 && activeHeaderRow === jumpRowIndex && activeHeaderItemIndex === index;
            return (
              <button
                key={letter}
                onClick={() => onJumpToRail(`alpha-${letter}`)}
                onMouseEnter={() => onSetHeaderFocus(jumpRowIndex, index)}
                className={`w-8 h-8 flex items-center justify-center rounded text-[11px] font-black transition-all border ${
                  isFocused
                    ? 'bg-white text-[#0a0a0f] border-white scale-125 z-10 shadow-xl'
                    : 'bg-white/5 border-transparent text-white/30 hover:text-white hover:bg-white/10'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
