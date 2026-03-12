"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Game } from '@/types/game';
import { getDbGames, exitApp } from '@/lib/tauri-bridge';
import { sortGames } from '@/utils/sorting';
import { useSettings, Settings } from '@/contexts/SettingsContext';
import { GridView } from '@/components/GridView';
import { ListView } from '@/components/ListView';
import { ImageSlider } from '@/components/ImageSlider';
import { DetailView } from '@/components/DetailView';
import { SettingsView } from '@/components/SettingsModal';
import { FilterDrawer } from '@/components/FilterDrawer';
import { AlphabetJumpBar } from '@/components/AlphabetJumpBar';
import { GameFilters } from '@/lib/tauri-bridge';
import { useGamepad } from '@/hooks/useGamepad';
import { useInputMode } from '@/hooks/useInputMode';

type ViewMode = 'grid' | 'list' | 'settings';

const LETTERS = ['#', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

export default function Home() {
  const { settings, markAsPlayed, resolveMediaPath, updateSettings } = useSettings();
  const [viewMode, setViewMode] = useState<ViewMode>(settings.lastViewMode || 'grid');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<GameFilters>({});
  const [mounted, setMounted] = useState(false);
  const { isMouseMode, onGamepadInput } = useInputMode();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialise filters from settings (e.g. hide adult content by default)
  useEffect(() => {
    setFilters(prev => ({ ...prev, hideAdult: settings.hideAdultContent }));
  }, [settings.hideAdultContent]);
  
  const [games, setGames] = useState<Game[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [sortCol, setSortCol] = useState<keyof Game>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  const [searchInput, setSearchInput] = useState('');
  const closeDetail = useCallback(() => setSelectedGame(null), []);
  const shelfRef = useRef<HTMLDivElement>(null);

  // Scroll focused shelf item into view
  useEffect(() => {
    if (focusedIndex < 0 && shelfRef.current) {
      const recentCount = settings.recentlyPlayedIds.length;
      if (recentCount === 0) return;
      const shelfIdx = focusedIndex + recentCount; // convert -N...-1 to 0...N-1
      const child = shelfRef.current.children[shelfIdx] as HTMLElement;
      if (child) {
        child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [focusedIndex, settings.recentlyPlayedIds.length]);

  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    async function fetchGames() {
      // Pass the filters object to the backend
      const dbGames = await getDbGames(500, 0, filters);
      setGames(dbGames);
      
      // Restore focus/selection after first fetch
      if (!isRestored) {
        if (settings.lastSelectedGameId) {
          const found = dbGames.find(g => g.id.toString() === settings.lastSelectedGameId);
          if (found) {
            setFocusedIndex(dbGames.indexOf(found));
            setSelectedGame(found);
          } else {
            // fetch it specifically if not in top 500
            const single = await getDbGames(1, 0, { favoriteIds: [settings.lastSelectedGameId] });
            if (single.length > 0) {
              setSelectedGame(single[0]);
            }
          }
        } else if (settings.lastFocusedIndex !== undefined) {
          setFocusedIndex(settings.lastFocusedIndex);
        }
        setIsRestored(true);
      } else {
        // Only reset focus if we're NOT in a restoration phase
        // and NOT looking at a specific game (detail view)
        if (!selectedGame) {
           setFocusedIndex(-1);
        }
      }
    }
    fetchGames();
  }, [filters, isRestored]);

  // Update settings when state changes
  useEffect(() => {
    if (isRestored) {
       updateSettings({ lastFocusedIndex: focusedIndex >= 0 ? focusedIndex : 0 });
    }
  }, [focusedIndex, updateSettings, isRestored]);

  useEffect(() => {
     if (isRestored) {
       updateSettings({ 
         lastSelectedGameId: selectedGame?.id.toString() || null,
         lastViewMode: viewMode === 'settings' ? settings.lastViewMode : viewMode
       });
     }
  }, [selectedGame, viewMode, updateSettings, isRestored, settings.lastViewMode]);

  useEffect(() => {
    // Debounce search input
    const timer = setTimeout(() => {
      setFilters(prev => {
        const newFilters = { ...prev, searchQuery: searchInput || undefined };
        // If we are searching, clear browsing filters (letter, genre) to ensure a global search
        if (searchInput.trim()) {
           newFilters.letter = undefined;
           newFilters.genre = undefined;
        }
        return newFilters;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Controller integration
  useGamepad({
    onButtonDown: (btn) => {
      onGamepadInput();
      if (btn === 'Y') setShowFilters(prev => !prev);
      if (btn === 'X') setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
      if (btn === 'START') setViewMode('settings');

      if (btn === 'B') {
        if (showFilters) setShowFilters(false);
        else if (selectedGame) setSelectedGame(null); // B = back from detail view
      }
      
      // Bumpers trigger A-Z jumping
      if (btn === 'RB' || btn === 'LB') {
        const curIdx = filters.letter ? LETTERS.indexOf(filters.letter) : -1;
        let nextIdx = 0;
        if (btn === 'RB') nextIdx = curIdx + 1 >= LETTERS.length ? 0 : curIdx + 1;
        if (btn === 'LB') nextIdx = curIdx - 1 < 0 ? LETTERS.length - 1 : curIdx - 1;
        setFilters(prev => ({ ...prev, letter: LETTERS[nextIdx], searchQuery: undefined }));
        setSearchInput(''); // Clear search on letter jump
      }

        // Spatial navigation in Grid/List
        if (!showFilters && !selectedGame && viewMode !== 'settings') {
          const cols = viewMode === 'list' ? 1 : 
                      (typeof window !== 'undefined' ? (window.innerWidth >= 1024 ? 6 : (window.innerWidth >= 768 ? 4 : 2)) : 6);
          
          const recentCount = settings.recentlyPlayedIds.length;
          const minIdx = recentCount > 0 ? -recentCount : 0;
          const maxIdx = games.length - 1;

          if (btn === 'RIGHT') setFocusedIndex(p => Math.min(p + 1, maxIdx));
          if (btn === 'LEFT')  setFocusedIndex(p => Math.max(p - 1, minIdx));
          
          if (btn === 'DOWN') {
            setFocusedIndex(p => {
              if (p < 0) return 0; // jump from shelf to top of grid
              return Math.min(p + cols, maxIdx);
            });
          }
          if (btn === 'UP') {
            setFocusedIndex(p => {
              if (p >= 0 && p < cols && recentCount > 0) {
                 // Jump to corresponding relative position in shelf
                 const ratio = p / Math.max(cols - 1, 1);
                 const shelfIdx = Math.floor(ratio * (recentCount - 1));
                 return shelfIdx - recentCount;
              }
              if (p < 0) return p;
              return Math.max(p - cols, minIdx);
            });
          }
          
          if (btn === 'A') {
            if (focusedIndex < 0) {
              const rId = settings.recentlyPlayedIds[recentCount + focusedIndex];
              const g = games.find(game => game.id.toString() === rId);
              if (g) handleGameSelect(g);
            } else if (focusedIndex < games.length) {
              handleGameSelect(games[focusedIndex]);
            }
          }
        }
    }
  });

  const handleGameSelect = useCallback((game: Game) => {
    setSelectedGame(game);
    markAsPlayed(game.id.toString());
  }, [markAsPlayed]);

  // Keyboard fallbacks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if they are typing in the search box
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.key === 'f' || e.key === 'F') {
        setShowFilters(prev => !prev);
      }
      if (e.key === 's' || e.key === 'S') {
        setViewMode('settings');
      }
      if (e.key === 'v' || e.key === 'V') {
        setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
      }

      if (e.key === 'Enter' && e.altKey) {
        e.preventDefault();
        updateSettings({ isFullscreen: !settings.isFullscreen });
      }
      
      if (e.key === 'PageDown' || e.key === 'PageUp') {
        e.preventDefault();
        setFilters(prev => {
           const curIdx = prev.letter ? LETTERS.indexOf(prev.letter) : -1;
           let nextIdx = 0;
           if (e.key === 'PageDown') nextIdx = curIdx + 1 >= LETTERS.length ? 0 : curIdx + 1;
           if (e.key === 'PageUp') nextIdx = curIdx - 1 < 0 ? LETTERS.length - 1 : curIdx - 1;
           return { ...prev, letter: LETTERS[nextIdx], searchQuery: undefined };
        });
        setSearchInput(''); // Clear search on keyboard jump
      }

      // Arrow spatial navigation
      if (!showFilters && !selectedGame && viewMode !== 'settings') {
        const cols = viewMode === 'list' ? 1 : 
                    (typeof window !== 'undefined' ? (window.innerWidth >= 1024 ? 6 : (window.innerWidth >= 768 ? 4 : 2)) : 6);

        const recentCount = settings.recentlyPlayedIds.length;
        const minIdx = recentCount > 0 ? -recentCount : 0;
        const maxIdx = games.length - 1;

        if (e.key === 'ArrowRight') { e.preventDefault(); setFocusedIndex(p => Math.min(p + 1, maxIdx)); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); setFocusedIndex(p => Math.max(p - 1, minIdx)); }
        if (e.key === 'ArrowDown')  {
          e.preventDefault();
          setFocusedIndex(p => {
            if (p < 0) return 0;
            return Math.min(p + cols, maxIdx);
          });
        }
        if (e.key === 'ArrowUp')    {
          e.preventDefault();
          setFocusedIndex(p => {
            if (p >= 0 && p < cols && recentCount > 0) {
              const ratio = p / Math.max(cols - 1, 1);
              const shelfIdx = Math.floor(ratio * (recentCount - 1));
              return shelfIdx - recentCount;
            }
            return Math.max(p - cols, minIdx);
          });
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          if (focusedIndex < 0) {
            const rId = settings.recentlyPlayedIds[recentCount + focusedIndex];
            const g = games.find(game => game.id.toString() === rId);
            if (g) handleGameSelect(g);
          } else if (focusedIndex < games.length) {
            handleGameSelect(games[focusedIndex]);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFilters, selectedGame, viewMode, games, focusedIndex, filters.letter, handleGameSelect, settings.isFullscreen, settings.recentlyPlayedIds, updateSettings]);

  useEffect(() => {
    let timeoutId: any;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        const { getWindowSize } = await import('../lib/tauri-bridge');
        const size = await getWindowSize();
        if (size && !settings.isFullscreen) {
          const config: Partial<Settings> = { 
            windowWidth: size.width, 
            windowHeight: size.height 
          };
          
          // Only clear preset if the manual resize made it differ from the preset
          if (settings.displayResolution !== 'default') {
            const [pw, ph] = settings.displayResolution.split('x').map(Number);
            if (pw !== size.width || ph !== size.height) {
              config.displayResolution = 'default';
            }
          }
          
          updateSettings(config);
        }
      }, 500);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [settings.isFullscreen, updateSettings]);

  const handleSort = (column: keyof Game) => {
    const newDir = sortCol === column && sortDir === 'asc' ? 'desc' : 'asc';
    setSortCol(column);
    setSortDir(newDir);
    setGames(sortGames(games, column, newDir));
  };

  if (viewMode === 'settings') {
    return (
      <main className="min-h-screen bg-gray-950 text-white font-sans selection:bg-blue-600/50 flex flex-col">
        <SettingsView onBack={() => setViewMode('grid')} />
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

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col font-sans">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center font-bold font-mono">64</div>
          <h1 className="text-xl font-bold tracking-tight">Project 64Box</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search games..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-sm rounded-full px-4 py-1.5 focus:outline-none focus:border-blue-500 transition-colors w-64 shadow-inner"
            />
          </div>

          <button 
             onClick={() => setShowFilters(true)}
             className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-widest font-bold border transition shadow hover:bg-gray-700 ${Object.keys(filters).length > 0 ? 'bg-blue-900/40 text-blue-400 border-blue-700/50' : 'bg-gray-800 text-gray-400 border-gray-700'}`}
          >
             Y Filters
          </button>

          <div className="flex bg-gray-950 p-1 rounded-lg ml-4">
            <button 
              className={`px-4 py-1.5 rounded-md transition-colors text-sm font-medium ${viewMode === 'grid' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              onClick={() => setViewMode('grid')}
            >
              Grid {viewMode === 'list' && <span className="text-[10px] opacity-50 ml-1">(X)</span>}
            </button>
            <button 
              className={`px-4 py-1.5 rounded-md transition-colors text-sm font-medium ${viewMode === 'list' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              onClick={() => setViewMode('list')}
            >
              List {viewMode === 'grid' && <span className="text-[10px] opacity-50 ml-1">(X)</span>}
            </button>
          </div>
          
          <button 
             onClick={() => setViewMode('settings')}
             className="w-10 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors ml-2 gap-1"
             title="Settings"
          >
             ⚙️ <span className="text-[10px] opacity-50 hidden md:inline">START</span>
          </button>

          <button 
             onClick={() => exitApp()}
             className="w-10 h-8 flex items-center justify-center text-red-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors ml-1"
             title="Exit Application"
          >
             ⏻
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-auto pl-8 pr-4">
        <AlphabetJumpBar 
          activeLetter={filters.letter} 
          onLetterSelect={(l) => {
            setFilters(prev => ({ ...prev, letter: prev.letter === l ? undefined : l, searchQuery: undefined }));
            setSearchInput(''); // Clear search box when browsing by letter
          }} 
        />
        
        {/* Recently Played Shelf */}
        {mounted && settings.recentlyPlayedIds.length > 0 && (
          <div className="mt-6 mb-10 px-4">
             <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-bold text-gray-200 tracking-tight">Recent Games</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-gray-700 to-transparent"></div>
             </div>
             <div ref={shelfRef} className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar-hidden snap-x scroll-smooth">
               {settings.recentlyPlayedIds.map((id, idx) => {
                  const g = games.find(game => game.id.toString() === id);
                  if (!g) return null;
                  
                  // Map idx to negative focusedIndex: -recentCount ... -1
                  const focusIdx = idx - settings.recentlyPlayedIds.length;
                  const isFocused = focusedIndex === focusIdx;

                  return (
                    <div 
                      key={id}
                      onClick={() => handleGameSelect(g)}
                      onMouseEnter={() => isMouseMode && setFocusedIndex(focusIdx)}
                      className={`shrink-0 w-[240px] aspect-[1.6] bg-gray-950 rounded-lg overflow-hidden border transition-all cursor-pointer shadow-xl snap-start relative group ${
                        isFocused 
                        ? 'border-yellow-500 ring-2 ring-yellow-500/50 scale-105 z-10' 
                        : 'border-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <ImageSlider
                        type="screenshot"
                        filename={g.screenshotFilename}
                        alt={g.name}
                        className="w-full h-full object-contain"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity flex items-end p-3 ${isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                         <div className="text-xs font-bold text-white truncate w-full tracking-tight">{g.name}</div>
                      </div>
                    </div>
                  );
               })}
             </div>
          </div>
        )}

        {viewMode === 'grid' ? (
          <GridView 
            games={games} 
            onSelectGame={handleGameSelect} 
            focusedIndex={focusedIndex >= 0 ? focusedIndex : -1} 
            onFocusChange={isMouseMode ? setFocusedIndex : undefined}
          />
        ) : (
          <ListView 
            games={games} 
            onSelectGame={handleGameSelect} 
            onSort={handleSort} 
            focusedIndex={focusedIndex >= 0 ? focusedIndex : -1}
            onFocusChange={isMouseMode ? setFocusedIndex : undefined}
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
