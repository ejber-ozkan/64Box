"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Game } from '../types/game';
import { Settings } from '../contexts/SettingsContext';
import { HorizontalRail } from './HorizontalRail';
import { getDbGames, exitApp } from '../lib/tauri-bridge';
import { useFavorites } from '../hooks/useFavorites';
import { useGamepad } from '../hooks/useGamepad';
import { useInputMode } from '../hooks/useInputMode';
import { ImageSlider } from './ImageSlider';
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
  const { favorites } = useFavorites();
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

  const letters = ['#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  const HEADER_HEIGHT = 320;

  const containerRef = useRef<HTMLDivElement>(null);
  const lastEscTime = useRef<number>(0);

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
          const rails: RailCategory[] = letters.map(l => ({
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
  }, [settings.recentlyPlayedIds, favorites.length, searchInput, filters]);

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
  }, [activeRailIndex, alphabetRails.length, filters, searchInput]);

  // Combine logic
  const rails: RailCategory[] = [];
  
  if (searchInput) {
     rails.push(...alphabetRails); // alphabetRails contains the search result during search
  } else {
    if (recentGames.length > 0) rails.push({ id: 'recent', title: 'Recent Games', games: recentGames, type: 'recent', scale: 'large' });
    if (favoriteGames.length > 0) rails.push({ id: 'favorites', title: 'Your Favorites', games: favoriteGames, type: 'favorites' });
    if (classicGames.length > 0) rails.push({ id: 'classics', title: 'Legendary Classics', games: classicGames, type: 'classics' });
    rails.push(...alphabetRails);
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent | { key: string }) => {
    const isInputFocused = document.activeElement?.tagName === 'INPUT';
    
    const rowCounts = [
      3, // Row 0: Search, Settings, Exit
      genres.length, // Row 1: Genres
      letters.length // Row 2: Letters
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
      if ((e as any).key !== 'Escape') return;
    }

    const isHeaderActive = activeRailIndex === -1;
    const rail = rails[activeRailIndex];
    const curIdx = rail ? (railFocusIndices[rail.id] || 0) : 0;
    const isGrid = rail?.type === 'alphabet';
    const cols = 10;

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
          // Entering next section at the top (column 0 or same column)
          const nextRailIdx = activeRailIndex + 1;
          if (nextRailIdx < rails.length) {
            const nextRail = rails[nextRailIdx];
            const currentCol = curIdx % cols;
            // For grids, try to stay in same column. For rails, always 0.
            const targetIdx = nextRail.type === 'alphabet' ? Math.min(currentCol, nextRail.games.length - 1) : 0;
            
            setRailFocusIndices(prev => ({ ...prev, [nextRail.id]: targetIdx }));
            setActiveRailIndex(nextRailIdx);
          }
        }
      } else {
        const nextRailIdx = activeRailIndex + 1;
        if (nextRailIdx < rails.length) {
          const nextRail = rails[nextRailIdx];
          // Always land on top/start of next rail
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
            const currentCol = curIdx % cols;
            
            if (prevRail.type === 'alphabet') {
              // Target the BOTTOM ROW of the previous grid
              const totalGames = prevRail.games.length;
              const fullRows = Math.floor((totalGames - 1) / cols);
              const targetIdx = Math.min(fullRows * cols + currentCol, totalGames - 1);
              
              setRailFocusIndices(prev => ({ ...prev, [prevRail.id]: targetIdx }));
            } else {
              // Horizontal rails: Land on last focused or last item
              const targetIdx = railFocusIndices[prevRail.id] ?? 0;
              setRailFocusIndices(prev => ({ ...prev, [prevRail.id]: targetIdx }));
            }
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
          if (prevRail.type === 'alphabet') {
              // Moving from horizontal rail to a grid: land on its BOTTOM row
              const totalGames = prevRail.games.length;
              const fullRows = Math.floor((totalGames - 1) / cols);
              setRailFocusIndices(prev => ({ ...prev, [prevRail.id]: Math.min(fullRows * cols, totalGames - 1) }));
          }
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
          const letter = letters[activeHeaderItemIndex];
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
    }
  }, [activeRailIndex, rails, railFocusIndices, onSelectGame, onShowSettings, activeHeaderItemIndex, activeHeaderRow, genres, letters, filters, onFiltersChange]);

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

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown as any);
    return () => window.removeEventListener('keydown', handleKeyDown as any);
  }, [handleKeyDown]);

  // Main Section Jump Scroller
  // Uses manual offset calculation for absolute precision under the sticky header
  useEffect(() => {
    if (containerRef.current) {
      if (activeRailIndex === -1) {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const mainEl = containerRef.current.querySelector('main');
        if (mainEl) {
          const railEl = mainEl.children[activeRailIndex] as HTMLElement;
          if (railEl) {
            const targetTop = railEl.offsetTop - HEADER_HEIGHT;
            containerRef.current.scrollTo({
              top: targetTop,
              behavior: 'smooth'
            });
          }
        }
      }
    }
  }, [activeRailIndex]);
  
  // Vertical Tile Tracker
  // Keeps the focused tile visible within the grid without fighting section jumps
  const lastRail = useRef(activeRailIndex);
  useEffect(() => {
    const isJump = lastRail.current !== activeRailIndex;
    lastRail.current = activeRailIndex;

    // Jumping is handled by the Main Section effect above
    if (isJump || activeRailIndex === -1) return;

    const rail = rails[activeRailIndex];
    if (rail?.type !== 'alphabet' || !containerRef.current) return;

    const focusedIdx = railFocusIndices[rail.id] || 0;
    const mainEl = containerRef.current.querySelector('main');
    const railEl = mainEl?.children[activeRailIndex] as HTMLElement;
    const gridEl = railEl?.querySelector('.grid');
    const tile = gridEl?.children[focusedIdx] as HTMLElement;

    if (tile) {
      const rect = tile.getBoundingClientRect();
      const footerBuffer = 80;
      
      if (rect.top < HEADER_HEIGHT) {
        // Only scroll if we are moving UP and hit the header border
        tile.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // After scrollIntoView, we might need a manual nudge if block:start hit the physical top
        setTimeout(() => {
           if (containerRef.current && railEl && tile) {
             const target = (railEl.offsetTop + tile.offsetTop) - HEADER_HEIGHT;
             if (Math.abs(containerRef.current.scrollTop - target) > 5) {
                containerRef.current.scrollTo({ top: target, behavior: 'smooth' });
             }
           }
        }, 300);
      } else if (rect.bottom > window.innerHeight - footerBuffer) {
        // Scroll into view at bottom
        tile.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [activeRailIndex, railFocusIndices, rails]);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-[#0a0a0f] text-white flex flex-col overflow-y-auto no-scrollbar select-none scroll-smooth"
      onKeyDown={handleKeyDown as any}
      tabIndex={0}
    >
      {/* Cinematic Background Blur */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-blue-900/10 blur-[100px] animate-pulse"></div>
         <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-purple-900/10 blur-[100px]"></div>
      </div>

      {/* Top Bar - Fixed */}
      <header className="sticky top-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-3xl border-b border-white/5 flex flex-col">
        {/* Row 0: Search & Buttons */}
        <div className="px-12 py-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 leading-none">
                64Box
              </h1>
              <div className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/40 ml-1">Commodore 64 Edition</div>
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
            {letters.map((l, i) => {
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
                <div key={rail.id} className={`flex flex-col gap-6 py-12 transition-all duration-700 scroll-mt-[340px] ${isActive ? 'opacity-100' : 'opacity-20 translate-y-4'}`}>
                  <div className="flex items-center gap-4 px-12">
                    <h2 className={`text-4xl font-black uppercase tracking-tighter ${isActive ? 'text-blue-400' : 'text-gray-600'}`}>
                      {rail.title}
                    </h2>
                    <div className={`h-px flex-1 bg-gradient-to-r ${isActive ? 'from-blue-900 via-blue-500 to-transparent' : 'from-gray-800 to-transparent'}`}></div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-4 px-12">
                    {rail.games.map((game, gIdx) => {
                      const isFocused = isActive && (gIdx === focusedIdx);
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
                          className={`aspect-[1.6] bg-gray-950 rounded-lg overflow-hidden border transition-all cursor-pointer relative group ${
                            isFocused 
                              ? 'border-blue-400 scale-110 z-10 shadow-[0_0_30px_rgba(59,130,246,0.4)]' 
                              : 'border-white/5 hover:border-white/20'
                          }`}
                        >
                          <ImageSlider
                            type="screenshot"
                            filename={game.screenshotFilename}
                            alt={game.name}
                            className="w-full h-full object-cover"
                          />
                          <div className={`absolute inset-0 bg-black/60 flex flex-col justify-end p-2 transition-opacity ${isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                             <div className="text-[10px] font-bold text-white truncate leading-tight">{game.name}</div>
                          </div>
                          {isFocused && (
                            <div className="absolute inset-0 ring-2 ring-blue-500 ring-inset pointer-events-none"></div>
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
         </div>
         
         <div className="text-[10px] font-black text-white/20 tracking-[0.2em] uppercase">
            {totalGameCount} GAMES AVAILABLE
         </div>
      </footer>
    </div>
  );
}
