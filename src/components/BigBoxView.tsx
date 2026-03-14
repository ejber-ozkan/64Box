"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Game } from '../types/game';
import { Settings } from '../contexts/SettingsContext';
import { HorizontalRail } from './HorizontalRail';
import { getDbGames, exitApp } from '../lib/tauri-bridge';
import { useFavorites } from '../hooks/useFavorites';
import { useGamepad } from '../hooks/useGamepad';
import { useInputMode } from '../hooks/useInputMode';
import { BigBoxTileMedia } from './BigBoxTileMedia';
import { GameFilters } from '../lib/tauri-bridge';

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

type RailCategory = {
  id: string;
  title: string;
  games: Game[];
  type: 'recent' | 'favorites' | 'classics' | 'alphabet';
  scale?: 'large' | 'normal';
  letter?: string;
};

type KeyEventLike = Pick<KeyboardEvent, 'key'> | Pick<React.KeyboardEvent, 'key'>;

const LETTERS = ['#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'] as const;

function getRailStudioLabel(game: Game) {
  const publisher = game.publisher?.name && game.publisher.name !== '(Not Published)' ? game.publisher.name : '';
  const developer = game.developer?.name && game.developer.name !== '(Unknown)' ? game.developer.name : '';
  return publisher || developer || 'Unknown';
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
  const [activeRailIndex, setActiveRailIndex] = useState(0); // -1 = Header
  const [activeHeaderRow, setActiveHeaderRow] = useState(0); // 0: Buttons, 1: Genres, 2: Letters
  const [activeHeaderItemIndex, setActiveHeaderItemIndex] = useState(0); // Index within the active row
  const [railFocusIndices, setRailFocusIndices] = useState<Record<string, number>>({});
  
  const [genres, setGenres] = useState<string[]>([]);
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [favoriteGames, setFavoriteGames] = useState<Game[]>([]);
  const [classicGames, setClassicGames] = useState<Game[]>([]);
  const [alphabetRails, setAlphabetRails] = useState<RailCategory[]>([]);
  const [totalGameCount, setTotalGameCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const HEADER_HEIGHT_FALLBACK = 320;

  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const lastEscTime = useRef<number>(0);
  const pendingSectionDirectionRef = useRef<'up' | 'down' | null>(null);

  const getHeaderHeight = useCallback(() => {
    return headerRef.current?.offsetHeight ?? HEADER_HEIGHT_FALLBACK;
  }, []);

  const getGridColumns = useCallback(() => {
    if (typeof window === 'undefined') return 6;
    if (window.innerWidth >= 1536) return 6;
    if (window.innerWidth >= 1280) return 5;
    if (window.innerWidth >= 1024) return 4;
    if (window.innerWidth >= 640) return 2;
    return 1;
  }, []);

  const scrollElementBelowHeader = useCallback((element: HTMLElement, extraOffset = 0) => {
    const container = containerRef.current;
    if (!container) return;

    const headerHeight = getHeaderHeight();
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const targetTop =
      container.scrollTop + elementRect.top - containerRect.top - headerHeight - extraOffset;

    container.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });
  }, [getHeaderHeight]);

  // Double Esc Exit
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEscTime.current < 1000) {
          exitApp();
        }
        lastEscTime.current = now;
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Fetch genres on mount
  useEffect(() => {
    import('../lib/tauri-bridge').then(lib => lib.getGenres().then(setGenres));
  }, []);

  useEffect(() => {
    async function initData() {
      setLoading(true);
      try {
        const query = searchInput || undefined;
        
        // Get total count (placeholder for now, as getDbGames doesn't return count yet)
        setTotalGameCount(30000); 

        // 1. Fetch Recent (filtered by search if present)
        if (settings.recentlyPlayedIds.length > 0) {
           const recent = await getDbGames(100, 0, { ...filters, favoriteIds: settings.recentlyPlayedIds, searchQuery: query });
           const sortedRecent = settings.recentlyPlayedIds
             .map(id => recent.find(g => g.id.toString() === id))
             .filter((g): g is Game => !!g);
           setRecentGames(sortedRecent);
        } else {
           setRecentGames([]);
        }

        // 2. Fetch Favorites (filtered by search if present)
        if (favorites.length > 0) {
           const favGames = await getDbGames(100, 0, { ...filters, favoriteIds: favorites, searchQuery: query });
           setFavoriteGames(favGames);
        } else {
           setFavoriteGames([]);
        }

        // 3. Fetch Classics (filtered by search if present)
        const classics = await getDbGames(100, 0, { ...filters, isClassic: true, searchQuery: query });
        setClassicGames(classics);

        // 4. Initialize Alphabet Rails structure (titles only, no games yet)
        if (!query) {
          const rails: RailCategory[] = LETTERS.map(l => ({
            id: `alpha-${l}`,
            title: l === '#' ? '0-9 & Symbols' : `Letter ${l}`,
            games: [],
            type: 'alphabet',
            letter: l
          }));
          setAlphabetRails(rails);
        } else {
          // If searching, fetch all matching results into a special results rail (limit to 500 for performance)
          const results = await getDbGames(500, 0, { ...filters, searchQuery: query });
          const searchRail: RailCategory = {
            id: 'search-results',
            title: `Results for "${query}"`,
            games: results,
            type: 'alphabet'
          };
          setAlphabetRails([searchRail]);
        }

      } catch (err) {
        console.error('BigBox init error:', err);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, [settings.recentlyPlayedIds, favorites, searchInput, filters]);

  const rails = useMemo<RailCategory[]>(() => {
    if (searchInput) {
      return [...alphabetRails];
    }

    const nextRails: RailCategory[] = [];
    if (recentGames.length > 0) nextRails.push({ id: 'recent', title: 'Recent Games', games: recentGames, type: 'recent', scale: 'large' });
    if (favoriteGames.length > 0) nextRails.push({ id: 'favorites', title: 'Your Favorites', games: favoriteGames, type: 'favorites' });
    if (classicGames.length > 0) nextRails.push({ id: 'classics', title: 'Legendary Classics', games: classicGames, type: 'classics' });
    nextRails.push(...alphabetRails);
    return nextRails;
  }, [searchInput, alphabetRails, recentGames, favoriteGames, classicGames]);

  const currentRail = activeRailIndex >= 0 ? rails[activeRailIndex] : null;
  const currentRailId = currentRail?.id ?? null;
  const currentRailType = currentRail?.type ?? null;
  const currentFocusedIndex = currentRail ? (railFocusIndices[currentRail.id] || 0) : 0;

  // Vertical Lazy Loading Logic
  useEffect(() => {
    if (activeRailIndex === -1 || alphabetRails.length === 0) return;
    
    // Combine rails to find actual target index in alphabetRails
    const currentRail = rails[activeRailIndex];
    if (!currentRail || currentRail.type !== 'alphabet' || currentRail.games.length > 0) return;

    async function loadRailGames(railId: string, letter: string) {
       try {
         const games = await getDbGames(1000, 0, { ...filters, letter, searchQuery: searchInput || undefined });
         setAlphabetRails(prev => prev.map(r => r.id === railId ? { ...r, games } : r));
       } catch (err) {
         console.error(`Failed to lazy load ${letter}:`, err);
       }
    }

    if (currentRail.letter) {
      loadRailGames(currentRail.id, currentRail.letter);
    }
  }, [activeRailIndex, alphabetRails.length, filters, searchInput, rails]);

  const handleKeyDown = useCallback((e: KeyEventLike) => {
    const isInputFocused = document.activeElement?.tagName === 'INPUT';
    
    const rowCounts = [
      3, // Row 0: Search, Settings, Exit
      genres.length, // Row 1: Genres
      LETTERS.length // Row 2: Letters
    ];

    // If typing in search, only allow Escape or ArrowDown to exit focus
    if (isInputFocused) {
      if (e.key === 'Escape') {
        (document.activeElement as HTMLElement).blur();
        return;
      }
      if (e.key === 'ArrowDown') {
        (document.activeElement as HTMLElement).blur();
        setActiveHeaderRow(1); // Next row
        setActiveHeaderItemIndex(0);
        return;
      }
      // Block all other keys from triggering game navigation while typing
      return;
    }

    const isHeaderActive = activeRailIndex === -1;
    const rail = rails[activeRailIndex];
    const curIdx = rail ? (railFocusIndices[rail.id] || 0) : 0;
    const isGrid = rail?.type === 'alphabet';
    const cols = getGridColumns();

    if (e.key === 'ArrowDown') {
      if (isHeaderActive) {
        if (activeHeaderRow < 2) {
          setActiveHeaderRow(prev => prev + 1);
          setActiveHeaderItemIndex(0);
        } else {
          setActiveRailIndex(0);
        }
      } else if (isGrid) {
        const nextIdx = curIdx + cols;
        if (nextIdx < rail.games.length) {
          setRailFocusIndices(prev => ({ ...prev, [rail.id]: nextIdx }));
        } else {
          const nextRailIdx = activeRailIndex + 1;
          if (nextRailIdx < rails.length) {
            const nextRail = rails[nextRailIdx];
            pendingSectionDirectionRef.current = 'down';
            setRailFocusIndices(prev => ({ ...prev, [nextRail.id]: 0 }));
            setActiveRailIndex(nextRailIdx);
          }
        }
      } else {
        const nextRailIdx = activeRailIndex + 1;
        if (nextRailIdx < rails.length) {
          const nextRail = rails[nextRailIdx];
          pendingSectionDirectionRef.current = 'down';
          setRailFocusIndices(prev => ({ ...prev, [nextRail.id]: 0 }));
          setActiveRailIndex(nextRailIdx);
        }
      }
    } else if (e.key === 'ArrowUp') {
      if (isHeaderActive) {
        if (activeHeaderRow > 0) {
          setActiveHeaderRow(prev => prev - 1);
          setActiveHeaderItemIndex(0);
        }
        return;
      }
      if (isGrid) {
        const nextIdx = curIdx - cols;
        if (nextIdx >= 0) {
          setRailFocusIndices(prev => ({ ...prev, [rail.id]: nextIdx }));
        } else {
          const prevRailIdx = activeRailIndex - 1;
          if (prevRailIdx >= 0) {
            const prevRail = rails[prevRailIdx];
            pendingSectionDirectionRef.current = 'up';
            const targetIdx = Math.max(prevRail.games.length - 1, 0);
            setRailFocusIndices(prev => ({ ...prev, [prevRail.id]: targetIdx }));
            setActiveRailIndex(prevRailIdx);
          } else {
            setActiveRailIndex(-1);
            setActiveHeaderRow(2); // Jump to Jump-To bar
          }
        }
      } else {
        const prevRailIdx = activeRailIndex - 1;
        if (prevRailIdx >= 0) {
          const prevRail = rails[prevRailIdx];
          pendingSectionDirectionRef.current = 'up';
          setRailFocusIndices(prev => ({ ...prev, [prevRail.id]: Math.max(prevRail.games.length - 1, 0) }));
          setActiveRailIndex(prevRailIdx);
        } else {
          setActiveRailIndex(-1);
          setActiveHeaderRow(2);
        }
      }
    } else if (e.key === 'ArrowRight') {
      if (isHeaderActive) {
        setActiveHeaderItemIndex(prev => (prev + 1) % rowCounts[activeHeaderRow]);
      } else if (isGrid) {
        if (curIdx < rail.games.length - 1) {
          setRailFocusIndices(prev => ({ ...prev, [rail.id]: curIdx + 1 }));
        }
      } else {
        setRailFocusIndices(prev => ({
          ...prev,
          [rail.id]: (curIdx + 1) % rail.games.length
        }));
      }
    } else if (e.key === 'ArrowLeft') {
      if (isHeaderActive) {
        setActiveHeaderItemIndex(prev => (prev - 1 + rowCounts[activeHeaderRow]) % rowCounts[activeHeaderRow]);
      } else if (isGrid) {
        if (curIdx > 0) {
          setRailFocusIndices(prev => ({ ...prev, [rail.id]: curIdx - 1 }));
        }
      } else {
        setRailFocusIndices(prev => ({
          ...prev,
          [rail.id]: (curIdx - 1 + rail.games.length) % rail.games.length
        }));
      }
    } else if (e.key === 'LB_RB_RIGHT') {
      // Bumper Right = Next Section (Down)
      if (isHeaderActive) {
        if (activeHeaderRow < 2) {
          setActiveHeaderRow(prev => prev + 1);
          setActiveHeaderItemIndex(0);
        } else if (rails.length > 0) {
          setActiveRailIndex(0);
        }
      } else if (activeRailIndex < rails.length - 1) {
        setActiveRailIndex(prev => prev + 1);
      }
    } else if (e.key === 'LB_RB_LEFT') {
      // Bumper Left = Previous Section (Up)
      if (isHeaderActive) {
        if (activeHeaderRow > 0) {
          setActiveHeaderRow(prev => prev - 1);
          setActiveHeaderItemIndex(0);
        }
      } else if (activeRailIndex === 0) {
        setActiveRailIndex(-1);
        setActiveHeaderRow(2);
        setActiveHeaderItemIndex(0);
      } else {
        setActiveRailIndex(prev => prev - 1);
      }
    } else if (e.key === 'Enter' || e.key === 'a' || e.key === 'A') {
      if (isHeaderActive) {
        if (activeHeaderRow === 0) {
          if (activeHeaderItemIndex === 0) {
            const input = containerRef.current?.querySelector('input');
            if (input) (input as HTMLElement).focus();
          }
          else if (activeHeaderItemIndex === 1) onShowSettings();
          else if (activeHeaderItemIndex === 2) exitApp();
        } else if (activeHeaderRow === 1) {
          const genre = genres[activeHeaderItemIndex];
          onFiltersChange({ ...filters, genre: filters.genre === genre ? undefined : genre });
          setActiveRailIndex(0); // Jump to results
        } else if (activeHeaderRow === 2) {
          const letter = LETTERS[activeHeaderItemIndex];
          const targetId = `alpha-${letter}`;
          const targetRailIdx = rails.findIndex(r => r.id === targetId);
          if (targetRailIdx !== -1) {
            // Pre-load logic moved to useEffect for consistency
            setActiveRailIndex(targetRailIdx);
          }
        }
      } else {
        const game = rail?.games[curIdx];
        if (game) onSelectGame(game);
      }
    } else if (e.key === 'f' || e.key === 'F') {
      const game = rail?.games[curIdx];
      if (game) {
        toggleFavorite(game.id.toString());
      }
    }
  }, [activeRailIndex, getGridColumns, rails, railFocusIndices, onSelectGame, onShowSettings, activeHeaderItemIndex, activeHeaderRow, genres, filters, onFiltersChange, toggleFavorite]);

  useGamepad({
    onButtonDown: (btn) => {
      onGamepadInput();

      if (btn === 'DPAD_UP' || btn === 'UP') handleKeyDown({ key: 'ArrowUp' });
      if (btn === 'DPAD_DOWN' || btn === 'DOWN') handleKeyDown({ key: 'ArrowDown' });
      if (btn === 'DPAD_LEFT' || btn === 'LEFT') handleKeyDown({ key: 'ArrowLeft' });
      if (btn === 'DPAD_RIGHT' || btn === 'RIGHT') handleKeyDown({ key: 'ArrowRight' });
      if (btn === 'LB') handleKeyDown({ key: 'LB_RB_LEFT' });
      if (btn === 'RB') handleKeyDown({ key: 'LB_RB_RIGHT' });
      if (btn === 'A') handleKeyDown({ key: 'Enter' });
      if (btn === 'Y') handleKeyDown({ key: 'F' });
      if (btn === 'START') onShowSettings();
      if (btn === 'B') {
        if (document.activeElement?.tagName === 'INPUT') {
          (document.activeElement as HTMLElement).blur();
        } else {
          onBack?.();
        }
      }
    }
  });

  const handleWindowKeyDown = useCallback((event: KeyboardEvent) => {
    handleKeyDown(event);
  }, [handleKeyDown]);

  useEffect(() => {
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [handleWindowKeyDown]);

  // Main Section Jump Scroller
  // Uses manual offset calculation for absolute precision under the sticky header
  useEffect(() => {
    if (containerRef.current) {
      if (activeRailIndex === -1) {
        pendingSectionDirectionRef.current = null;
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const mainEl = containerRef.current.querySelector('main');
        if (mainEl) {
          const railEl = mainEl.children[activeRailIndex] as HTMLElement;
          if (railEl) {
            const anchorEl = railEl.querySelector('[data-rail-anchor]') as HTMLElement | null;
            const gridEl = railEl.querySelector('.grid');
            const tile = gridEl?.children[currentFocusedIndex] as HTMLElement | undefined;
            const sectionDirection = pendingSectionDirectionRef.current;

            if (sectionDirection === 'up' && tile && currentRailType === 'alphabet') {
              tile.scrollIntoView({ behavior: 'smooth', block: 'end' });
            } else {
              scrollElementBelowHeader(anchorEl ?? railEl);
            }

            pendingSectionDirectionRef.current = null;
          }
        }
      }
    }
  }, [activeRailIndex, currentFocusedIndex, currentRailType, scrollElementBelowHeader]);
  
  // Keeps the focused tile visible while navigating within an alphabet grid.
  // Section jumps are handled by the effect above and should not be re-adjusted
  // when the rail lazily loads its game data.
  const lastRail = useRef(activeRailIndex);
  useEffect(() => {
    const isJump = lastRail.current !== activeRailIndex;
    lastRail.current = activeRailIndex;

    // Jumping is handled by the Main Section effect above
    if (isJump || activeRailIndex === -1) return;
    if (currentRailType !== 'alphabet' || !containerRef.current || !currentRailId) return;

    const headerHeight = getHeaderHeight();
    const containerRect = containerRef.current.getBoundingClientRect();
    const mainEl = containerRef.current.querySelector('main');
    const railEl = mainEl?.children[activeRailIndex] as HTMLElement;
    const gridEl = railEl?.querySelector('.grid');
    const tile = gridEl?.children[currentFocusedIndex] as HTMLElement;

    if (tile) {
      const rect = tile.getBoundingClientRect();
      const visibleTop = containerRect.top + headerHeight;
      const footerBuffer = 80;
      
      if (rect.top < visibleTop) {
        // Only scroll if we are moving UP and hit the header border
        scrollElementBelowHeader(tile, 12);
      } else if (rect.bottom > containerRect.bottom - footerBuffer) {
        // Scroll into view at bottom
        tile.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [activeRailIndex, currentFocusedIndex, currentRailId, currentRailType, getHeaderHeight, scrollElementBelowHeader]);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-[#0a0a0f] text-white flex flex-col overflow-y-auto no-scrollbar select-none scroll-smooth"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Cinematic Background Blur */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-blue-900/10 blur-[100px] animate-pulse"></div>
         <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-purple-900/10 blur-[100px]"></div>
      </div>

      {/* Top Bar - Fixed */}
      <header ref={headerRef} className="sticky top-0 z-50 border-b border-white/5 bg-[linear-gradient(180deg,rgba(7,11,18,0.96),rgba(10,10,15,0.82))] backdrop-blur-3xl flex flex-col shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
        {/* Row 0: Search & Buttons */}
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
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => {
                  setActiveRailIndex(-1);
                  setActiveHeaderRow(0);
                  setActiveHeaderItemIndex(0);
                }}
                className={`bg-white/5 border text-xl font-bold rounded-full px-8 py-3 outline-none transition-all w-[350px] placeholder:text-white/20 ${
                  activeRailIndex === -1 && activeHeaderRow === 0 && activeHeaderItemIndex === 0 
                  ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-white/10' 
                  : 'border-white/10 hover:border-white/20'
                }`}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-40 transition-opacity">
                 🔍
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
               onClick={() => onShowSettings()}
               onMouseEnter={() => {
                 setActiveRailIndex(-1);
                 setActiveHeaderRow(0);
                 setActiveHeaderItemIndex(1);
               }}
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
               onClick={() => exitApp()}
               onMouseEnter={() => {
                 setActiveRailIndex(-1);
                 setActiveHeaderRow(0);
                 setActiveHeaderItemIndex(2);
               }}
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

        {/* Row 1: Genres */}
        <div className="px-12 pb-4 flex items-center gap-2 overflow-x-hidden justify-center max-w-full">
          <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mr-4 shrink-0">Genre</div>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth flex-1 justify-center">
            {genres.map((g, i) => {
              const isSelected = filters.genre === g;
              const isFocused = activeRailIndex === -1 && activeHeaderRow === 1 && activeHeaderItemIndex === i;
              return (
                <button
                  key={g}
                  onClick={() => onFiltersChange({ ...filters, genre: filters.genre === g ? undefined : g })}
                  onMouseEnter={() => {
                    setActiveRailIndex(-1);
                    setActiveHeaderRow(1);
                    setActiveHeaderItemIndex(i);
                  }}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all border ${
                    isFocused
                    ? 'bg-blue-600 border-blue-400 text-white scale-105 shadow-lg z-10'
                    : (isSelected 
                       ? 'bg-blue-900/40 border-blue-500/50 text-blue-400' 
                       : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10')
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Letters */}
        <div className="px-12 pb-6 flex items-center gap-2 overflow-x-hidden border-t border-white/5 pt-4 justify-center max-w-full">
          <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mr-4 shrink-0">Jump To</div>
          <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar scroll-smooth flex-1 justify-center">
            {LETTERS.map((l, i) => {
              const isFocused = activeRailIndex === -1 && activeHeaderRow === 2 && activeHeaderItemIndex === i;
              return (
                <button
                  key={l}
                  onClick={() => {
                    const targetRailIdx = rails.findIndex(r => r.id === `alpha-` + l);
                    if (targetRailIdx !== -1) setActiveRailIndex(targetRailIdx);
                  }}
                  onMouseEnter={() => {
                    setActiveRailIndex(-1);
                    setActiveHeaderRow(2);
                    setActiveHeaderItemIndex(i);
                  }}
                  className={`w-8 h-8 flex items-center justify-center rounded text-[11px] font-black transition-all border ${
                    isFocused
                    ? 'bg-white text-[#0a0a0f] border-white scale-125 z-10 shadow-xl'
                    : 'bg-white/5 border-transparent text-white/30 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Rails Container - Added large padding to allow last letter to reach the top */}
      <main className="flex-1 pb-[100vh] z-10">
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
                <div key={rail.id} className={`flex flex-col gap-8 py-14 transition-all duration-700 scroll-mt-[340px] ${isActive ? 'opacity-100' : 'opacity-25 translate-y-4'}`}>
                  <div data-rail-anchor className="flex items-center gap-4 px-12">
                    <h2 className={`text-4xl font-black uppercase tracking-tighter ${isActive ? 'text-blue-300' : 'text-gray-600'}`}>
                      {rail.title}
                    </h2>
                    <div className={`h-px flex-1 bg-gradient-to-r ${isActive ? 'from-sky-400/70 via-cyan-300/40 to-transparent' : 'from-gray-800 to-transparent'}`}></div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-8 px-12 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 2xl:px-16">
                    {rail.games.map((game, gIdx) => {
                      const isFocused = isActive && (gIdx === focusedIdx);
                      const hasArtwork = Boolean(game.coverPath || game.screenshotFilename);
                      return (
                        <div 
                          key={`${rail.id}-${game.id}-${gIdx}`}
                          onClick={() => onSelectGame(game)}
                          onMouseEnter={() => {
                            if (isMouseMode) {
                              setActiveRailIndex(idx);
                              setRailFocusIndices(prev => ({ ...prev, [rail.id]: gIdx }));
                            }
                          }}
                          className={`group relative aspect-[1.75] cursor-pointer overflow-hidden rounded-[26px] border border-white/10 bg-[#09111b] shadow-[0_18px_60px_rgba(2,6,23,0.45)] transition-all duration-500 ${
                            isFocused 
                              ? `${hasArtwork ? 'scale-[1.3]' : 'scale-110'} z-10 border-cyan-300/80 shadow-[0_28px_80px_rgba(56,189,248,0.35)]`
                              : 'hover:-translate-y-1 hover:border-white/20'
                          }`}
                        >
                          {isFavorite(game.id.toString()) && (
                            <div className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-pink-300/60 bg-black/55 text-lg text-pink-300 shadow-[0_12px_30px_rgba(15,23,42,0.45)] backdrop-blur-md">
                              ♥
                            </div>
                          )}
                          <BigBoxTileMedia game={game} className="absolute inset-0" />
                          <div className={`absolute inset-x-0 bottom-0 flex flex-col gap-1 border-t border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.92))] p-4 transition-all duration-500 ${isFocused ? 'translate-y-0' : ''}`}>
                             <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/80">
                               {game.year || 'Classic'} {game.parentGenre ? `• ${game.parentGenre}` : ''}
                             </div>
                             <div className="text-base font-black leading-tight text-white line-clamp-2">
                               {game.name}
                             </div>
                             <div className="text-xs font-medium text-white/60 truncate">
                               {getRailStudioLabel(game)}
                             </div>
                          </div>
                          {isFocused && (
                            <div className="pointer-events-none absolute inset-0 ring-2 ring-cyan-300/70 ring-inset"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
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
                  onFocusChange={(fIdx) => {
                    setActiveRailIndex(idx);
                    setRailFocusIndices(prev => ({ ...prev, [rail.id]: fIdx }));
                  }}
                  isFavorite={isFavorite}
                  tileScale={rail.scale}
                  loop={rail.games.length > 6}
                />
              </div>
            );
          })
        )}
      </main>

      {/* Bottom Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-black to-transparent z-50 flex items-center justify-between px-12 pointer-events-none">
         <div className="flex items-center gap-8 text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">
            <div className="flex items-center gap-2"><span className="w-5 h-5 bg-white/10 rounded flex items-center justify-center text-white">A</span> SELECT</div>
            <div className="flex items-center gap-2"><span className="w-5 h-5 bg-white/10 rounded flex items-center justify-center text-white">B</span> BACK</div>
            <div className="flex items-center gap-2"><span className="w-5 h-5 bg-white/10 rounded flex items-center justify-center text-white">Y</span> FAVORITE</div>
         </div>
         
         <div className="text-[10px] font-black text-white/20 tracking-[0.2em] uppercase">
            {totalGameCount} GAMES AVAILABLE
         </div>
      </footer>
    </div>
  );
}
