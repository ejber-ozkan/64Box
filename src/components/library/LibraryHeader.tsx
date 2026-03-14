"use client";

import type { GameFilters } from '../../lib/tauri-bridge';
import type { LibraryViewMode } from '../../hooks/useLibraryBrowserState';

interface LibraryHeaderProps {
  filters: GameFilters;
  onExit: () => void;
  onOpenSettings: () => void;
  onSearchChange: (value: string) => void;
  onShowFilters: () => void;
  onViewModeChange: (viewMode: LibraryViewMode) => void;
  searchInput: string;
  viewMode: LibraryViewMode;
}

export function LibraryHeader({
  filters,
  onExit,
  onOpenSettings,
  onSearchChange,
  onShowFilters,
  onViewModeChange,
  searchInput,
  viewMode,
}: LibraryHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-700 bg-gray-800 px-6 py-4 shadow-md">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 font-mono font-bold">64</div>
        <h1 className="text-xl font-bold tracking-tight">Project 64Box</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search games..."
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-64 rounded-full border border-gray-700 bg-gray-900 px-4 py-1.5 text-sm shadow-inner transition-colors focus:border-blue-500 focus:outline-none"
          />
        </div>

        <button
          onClick={onShowFilters}
          className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest shadow transition hover:bg-gray-700 ${
            Object.keys(filters).length > 0
              ? 'border-blue-700/50 bg-blue-900/40 text-blue-400'
              : 'border-gray-700 bg-gray-800 text-gray-400'
          }`}
        >
          Filters
        </button>

        <div className="ml-4 flex rounded-lg bg-gray-950 p-1">
          <button
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'grid' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => onViewModeChange('grid')}
          >
            Grid {viewMode === 'list' && <span className="ml-1 text-[10px] opacity-50">(X)</span>}
          </button>
          <button
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'list' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => onViewModeChange('list')}
          >
            List {viewMode === 'grid' && <span className="ml-1 text-[10px] opacity-50">(X)</span>}
          </button>
        </div>

        <button
          onClick={onOpenSettings}
          className="ml-2 flex h-8 w-10 items-center justify-center gap-1 rounded-lg text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
          title="Settings"
        >
          ⚙️ <span className="hidden text-[10px] opacity-50 md:inline">START</span>
        </button>

        <button
          onClick={onExit}
          className="ml-1 flex h-8 w-10 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-900/20 hover:text-red-400"
          title="Exit Application"
        >
          ⏻
        </button>
      </div>
    </header>
  );
}
