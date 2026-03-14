"use client";

import { BigBoxTileMedia } from '../BigBoxTileMedia';
import { getPrimaryStudioLabel } from '../../lib/game-display';
import { BigBoxRailCategory } from '../../hooks/useBigBoxLibraryData';

interface BigBoxAlphabetRailProps {
  focusedIdx: number;
  isActive: boolean;
  isFavorite: (gameId: string) => boolean;
  isMouseMode: boolean;
  onFocus: (index: number) => void;
  onSelectGame: (gameId: number) => void;
  rail: BigBoxRailCategory;
}

export function BigBoxAlphabetRail({
  focusedIdx,
  isActive,
  isFavorite,
  isMouseMode,
  onFocus,
  onSelectGame,
  rail,
}: BigBoxAlphabetRailProps) {
  return (
    <div className={`flex flex-col gap-8 py-14 transition-all duration-700 scroll-mt-[340px] ${isActive ? 'opacity-100' : 'opacity-25 translate-y-4'}`}>
      <div data-rail-anchor className="flex items-center gap-4 px-12">
        <h2 className={`text-4xl font-black uppercase tracking-tighter ${isActive ? 'text-blue-300' : 'text-gray-600'}`}>
          {rail.title}
        </h2>
        <div className={`h-px flex-1 bg-gradient-to-r ${isActive ? 'from-sky-400/70 via-cyan-300/40 to-transparent' : 'from-gray-800 to-transparent'}`}></div>
      </div>

      <div className="grid grid-cols-1 gap-8 px-12 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 2xl:px-16">
        {rail.games.map((game, gameIndex) => {
          const isFocused = isActive && gameIndex === focusedIdx;
          const hasArtwork = Boolean(game.coverPath || game.screenshotFilename);
          return (
            <div
              key={`${rail.id}-${game.id}-${gameIndex}`}
              onClick={() => onSelectGame(game.id)}
              onMouseEnter={() => {
                if (isMouseMode) {
                  onFocus(gameIndex);
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
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 border-t border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.92))] p-4 transition-all duration-500">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/80">
                  {game.year || 'Classic'} {game.parentGenre ? `• ${game.parentGenre}` : ''}
                </div>
                <div className="text-base font-black leading-tight text-white line-clamp-2">
                  {game.name}
                </div>
                <div className="text-xs font-medium text-white/60 truncate">
                  {getPrimaryStudioLabel(game)}
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

