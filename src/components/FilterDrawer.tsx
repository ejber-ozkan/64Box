"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { GameFilters, getGenres } from '../lib/tauri-bridge';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: GameFilters;
  onChange: (filters: GameFilters) => void;
}

export function FilterDrawer({ isOpen, onClose, filters, onChange }: FilterDrawerProps) {
  const [genres, setGenres] = useState<string[]>([]);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const focusedIdxRef = useRef(0); // always holds the latest value for the rAF loop
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    getGenres().then(setGenres);
  }, []);

  // Build ordered list of focusable items: [ Favorites, Reset, All Genres, ...genres ]
  // Indices: 0 = Favorites, 1 = Reset All, 2 = All Genres, 3..n = genres
  const FAVORITES_IDX = 0;
  const RESET_IDX = 1;
  const ALL_GENRE_IDX = 2;
  const GENRE_START = 3;
  const itemCount = GENRE_START + genres.length;

  const focusItem = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, itemCount - 1));
    setFocusedIdx(clamped);
    focusedIdxRef.current = clamped;
    itemRefs.current[clamped]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [itemCount]);

  // Keyboard navigation inside the drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(focusedIdx + 1); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); focusItem(focusedIdx - 1); }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        itemRefs.current[focusedIdx]?.click();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIdx, focusItem, onClose]);

  // Gamepad polling inside the drawer when open
  useEffect(() => {
    if (!isOpen) return;
    const lastPressed: Record<number, boolean> = {};
    let lastMoveTime = 0;
    const MOVE_COOLDOWN_MS = 160; // prevent holding = instant scroll to end

    let raf: number;
    const poll = () => {
      const pad = navigator.getGamepads?.()[0];
      if (pad) {
        const now = performance.now();
        const pressed = (i: number) => pad.buttons[i]?.pressed ?? false;

        // B = close (no repeat needed)
        if (pressed(1) && !lastPressed[1]) onClose();

        // Up/Down: respect cooldown so each tick only moves by 1
        const upNow = pressed(12);
        const downNow = pressed(13);
        if ((upNow || downNow) && now - lastMoveTime > MOVE_COOLDOWN_MS) {
          lastMoveTime = now;
          if (upNow)   focusItem(focusedIdxRef.current - 1);
          if (downNow) focusItem(focusedIdxRef.current + 1);
        }

        // A = confirm (no repeat)
        if (pressed(0) && !lastPressed[0]) {
          itemRefs.current[focusedIdxRef.current]?.click();
        }

        [0, 1, 12, 13].forEach(i => { lastPressed[i] = pressed(i); });
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, focusItem, onClose]);

  const isFocused = (idx: number) => isOpen && focusedIdx === idx;

  const focusCls = (idx: number) =>
    isFocused(idx)
      ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900'
      : '';

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-gray-900 border-l border-gray-700 z-50 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-800 shrink-0">
          <h2 className="text-lg font-black text-white tracking-widest uppercase">Filters</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">↑↓</kbd>
            <span>navigate</span>
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">A/Enter</kbd>
            <span>select</span>
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">B/Esc</kbd>
            <span>close</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold ml-2">&times;</button>
        </div>

        {/* Scrollable body */}
        <div className="flex flex-col gap-1 overflow-y-auto p-4 flex-1">

          {/* Favourites toggle */}
          <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1 mt-1 px-1">Quick Filters</div>
          <button
            ref={el => { itemRefs.current[FAVORITES_IDX] = el; }}
            onClick={() => {
              if (filters.favoriteIds !== undefined) {
                onChange({ ...filters, favoriteIds: undefined });
              } else {
                const saved = JSON.parse(localStorage.getItem('gb64_favorites') || '[]');
                onChange({ ...filters, favoriteIds: saved });
              }
            }}
            className={`w-full text-left p-3 rounded-lg border transition ${
              filters.favoriteIds !== undefined
                ? 'bg-blue-900/40 border-blue-500 text-white'
                : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-800'
            } ${focusCls(FAVORITES_IDX)}`}
          >
            ❤️ Favourites Only
          </button>

          <button
            ref={el => { itemRefs.current[RESET_IDX] = el; }}
            onClick={() => onChange({ hideAdult: filters.hideAdult })}
            className={`w-full text-left p-3 rounded-lg border transition bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-800 ${focusCls(RESET_IDX)}`}
          >
            🔄 Reset All Filters
          </button>

          <hr className="border-gray-800 my-2" />

          {/* Genre filter */}
          <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1 px-1">Genre</div>

          <button
            ref={el => { itemRefs.current[ALL_GENRE_IDX] = el; }}
            onClick={() => onChange({ ...filters, genre: undefined })}
            className={`w-full text-left p-3 rounded-lg border transition ${
              !filters.genre
                ? 'bg-blue-900/40 border-blue-500 text-white font-semibold'
                : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-800'
            } ${focusCls(ALL_GENRE_IDX)}`}
          >
            🎮 All Genres
          </button>

          {genres.map((g, i) => {
            const idx = GENRE_START + i;
            return (
              <button
                key={g}
                ref={el => { itemRefs.current[idx] = el; }}
                onClick={() => onChange({ ...filters, genre: filters.genre === g ? undefined : g })}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  filters.genre === g
                    ? 'bg-blue-900/40 border-blue-500 text-white font-semibold'
                    : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-800'
                } ${focusCls(idx)}`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
