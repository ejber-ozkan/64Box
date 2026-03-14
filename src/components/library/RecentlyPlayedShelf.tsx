"use client";

import type { RefObject } from 'react';
import { ImageSlider } from '../ImageSlider';
import type { Game } from '../../types/game';

interface RecentlyPlayedShelfProps {
  focusedIndex: number;
  games: Game[];
  isFavorite: (gameId: string) => boolean;
  isMouseMode: boolean;
  onFocusChange: (index: number) => void;
  onSelectGame: (game: Game) => void;
  recentIds: string[];
  shelfRef: RefObject<HTMLDivElement | null>;
}

export function RecentlyPlayedShelf({
  focusedIndex,
  games,
  isFavorite,
  isMouseMode,
  onFocusChange,
  onSelectGame,
  recentIds,
  shelfRef,
}: RecentlyPlayedShelfProps) {
  if (recentIds.length === 0) {
    return null;
  }

  return (
    <div className="mb-10 mt-6 px-4">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold tracking-tight text-gray-200">Recent Games</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-gray-700 to-transparent"></div>
      </div>
      <div ref={shelfRef} className="custom-scrollbar-hidden flex snap-x gap-4 overflow-x-auto pb-4 scroll-smooth">
        {recentIds.map((id, idx) => {
          const game = games.find((candidate) => candidate.id.toString() === id);
          if (!game) return null;

          const focusIndex = idx - recentIds.length;
          const isFocused = focusedIndex === focusIndex;

          return (
            <div
              key={id}
              onClick={() => onSelectGame(game)}
              onMouseEnter={() => isMouseMode && onFocusChange(focusIndex)}
              className={`group relative aspect-[1.6] w-[240px] shrink-0 snap-start cursor-pointer overflow-hidden rounded-lg border shadow-xl transition-all ${
                isFocused
                  ? 'z-10 scale-105 border-yellow-500 ring-2 ring-yellow-500/50'
                  : 'border-gray-800 bg-gray-950 hover:border-gray-600'
              }`}
            >
              {isFavorite(game.id.toString()) && (
                <div className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-pink-300/60 bg-black/60 text-sm text-pink-300 shadow-lg backdrop-blur-md">
                  ♥
                </div>
              )}
              <ImageSlider
                type="screenshot"
                filename={game.screenshotFilename}
                alt={game.name}
                className="h-full w-full object-contain"
              />
              <div
                className={`absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 transition-opacity ${
                  isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <div className="w-full truncate text-xs font-bold tracking-tight text-white">{game.name}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
