"use client";

import React, { useRef, useEffect } from 'react';
import { Game } from '../types/game';
import { BigBoxTileMedia } from './BigBoxTileMedia';

interface HorizontalRailProps {
  title: string;
  games: Game[];
  onSelectGame: (game: Game) => void;
  focusedIndex: number; // Index within the ORIGINAL games array
  isActive: boolean;    // Whether this rail is currently focused
  onFocusChange: (index: number) => void;
  tileScale?: 'large' | 'normal';
  loop?: boolean;
  isMouseFocusEnabled?: boolean;
  isFavorite?: (gameId: string) => boolean;
}

function getRailStudioLabel(game: Game) {
  const publisher = game.publisher?.name && game.publisher.name !== '(Not Published)' ? game.publisher.name : '';
  const developer = game.developer?.name && game.developer.name !== '(Unknown)' ? game.developer.name : '';
  return publisher || developer || 'Unknown';
}

export function HorizontalRail({ 
  title, 
  games, 
  onSelectGame, 
  focusedIndex, 
  isActive, 
  onFocusChange,
  tileScale = 'normal',
  loop = true,
  isMouseFocusEnabled = true,
  isFavorite
}: HorizontalRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // For infinite looping, we triple the items
  const displayGames = loop ? [...games, ...games, ...games] : games;
  const originalCount = games.length;
  const internalSelectedIndex = loop ? originalCount + focusedIndex : focusedIndex;

  // Scroll into view logic
  useEffect(() => {
    if (isActive && scrollRef.current) {
      const parent = scrollRef.current;
      const child = parent.children[internalSelectedIndex] as HTMLElement;
      if (child) {
        const parentRect = parent.getBoundingClientRect();
        const childRect = child.getBoundingClientRect();
        
        // Calculate scroll position to center the child
        const scrollLeft = child.offsetLeft - (parentRect.width / 2) + (childRect.width / 2);
        
        parent.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });
      }
    }
  }, [internalSelectedIndex, isActive]);

  if (games.length === 0) return null;

  const isLarge = tileScale === 'large';

  return (
    <div className={`flex flex-col gap-4 py-8 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-45'}`}>
      <div data-rail-anchor className="flex items-center gap-4 px-12">
        <h2 className={`text-3xl font-black uppercase tracking-tighter ${isActive ? 'text-blue-300' : 'text-gray-500'}`}>
          {title}
        </h2>
        <div className={`h-px flex-1 bg-gradient-to-r ${isActive ? 'from-sky-400/70 via-cyan-300/40 to-transparent' : 'from-gray-800 to-transparent'}`}></div>
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-8 overflow-x-hidden px-[8%] py-5 scroll-smooth"
      >
        {displayGames.map((game, idx) => {
          const isFocused = isActive && (idx === internalSelectedIndex);
          const hasArtwork = Boolean(game.coverPath || game.screenshotFilename);
          const favorited = isFavorite?.(game.id.toString()) ?? false;
          
          return (
            <div
              key={`${game.id}-${idx}`}
              onClick={() => onSelectGame(game)}
              onMouseEnter={() => {
                if (isMouseFocusEnabled) {
                  if (loop) {
                    // Normalize back to original index
                    onFocusChange(idx % originalCount);
                  } else {
                    onFocusChange(idx);
                  }
                }
              }}
              className={`group relative shrink-0 cursor-pointer overflow-hidden rounded-[26px] border border-white/10 bg-[#09111b] shadow-[0_18px_60px_rgba(2,6,23,0.45)] transition-all duration-500 ${
                isLarge ? 'w-[560px] aspect-[1.9]' : 'w-[380px] aspect-[1.78]'
              } ${
                isFocused 
                  ? `${hasArtwork ? 'scale-[1.3]' : 'scale-110'} z-10 border-cyan-300/80 shadow-[0_28px_80px_rgba(56,189,248,0.35)]`
                  : 'hover:-translate-y-1 hover:border-white/20'
              }`}
            >
              <BigBoxTileMedia game={game} className="absolute inset-0" />

              {favorited && (
                <div className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-pink-300/60 bg-black/55 text-lg text-pink-300 shadow-[0_12px_30px_rgba(15,23,42,0.45)] backdrop-blur-md">
                  ♥
                </div>
              )}
              
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 border-t border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.92))] p-6">
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200/80">
                  {game.year || 'Classic'} {game.parentGenre ? `• ${game.parentGenre}` : ''}
                </div>
                <div className={`${isLarge ? 'text-3xl' : 'text-xl'} font-black leading-tight text-white`}>
                  {game.name}
                </div>
                <div className="text-xs text-white/60 font-medium mt-1 truncate">
                  {getRailStudioLabel(game)}
                </div>
              </div>

              {/* Focus Glow Overlay */}
              {isFocused && (
                <div className="absolute inset-0 ring-4 ring-blue-500/50 ring-inset pointer-events-none animate-pulse"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
