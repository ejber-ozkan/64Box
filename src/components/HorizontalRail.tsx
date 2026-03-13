"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Game } from '../types/game';
import { ImageSlider } from './ImageSlider';

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
  isMouseFocusEnabled = true
}: HorizontalRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // For infinite looping, we triple the items
  const displayGames = loop ? [...games, ...games, ...games] : games;
  const originalCount = games.length;
  
  // Map our internal focused index (relative to 3x array) to the actual display
  // We want the focus to stay in the MIDDLE set of the triple-array
  const [internalSelectedIndex, setInternalSelectedIndex] = useState(loop ? originalCount + focusedIndex : focusedIndex);

  useEffect(() => {
    if (loop) {
      setInternalSelectedIndex(originalCount + focusedIndex);
    } else {
      setInternalSelectedIndex(focusedIndex);
    }
  }, [focusedIndex, originalCount, loop]);

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
    <div className={`flex flex-col gap-3 py-6 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
      <div className="flex items-center gap-4 px-12">
        <h2 className={`text-2xl font-black uppercase tracking-tighter ${isActive ? 'text-blue-400' : 'text-gray-500'}`}>
          {title}
        </h2>
        <div className={`h-px flex-1 bg-gradient-to-r ${isActive ? 'from-blue-900 via-blue-500 to-transparent' : 'from-gray-800 to-transparent'}`}></div>
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-6 overflow-x-hidden px-[10%] scroll-smooth py-4"
      >
        {displayGames.map((game, idx) => {
          const isFocused = isActive && (idx === internalSelectedIndex);
          
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
              className={`shrink-0 transition-all duration-300 relative group cursor-pointer rounded-xl overflow-hidden border-2 ${
                isLarge ? 'w-[450px] aspect-[1.8]' : 'w-[280px] aspect-[1.6]'
              } ${
                isFocused 
                  ? 'border-blue-400 scale-110 z-10 shadow-[0_0_40px_rgba(59,130,246,0.5)]' 
                  : 'border-white/5 hover:border-white/20'
              }`}
            >
              <ImageSlider
                type="screenshot"
                filename={game.screenshotFilename}
                alt={game.name}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay with info */}
              <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent transition-opacity duration-500 flex flex-col justify-end p-6 ${
                isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                <div className="text-sm font-black text-blue-400 uppercase tracking-widest mb-1">{game.year || 'Classic'}</div>
                <div className={`${isLarge ? 'text-2xl' : 'text-lg'} font-black text-white leading-tight truncate`}>
                  {game.name}
                </div>
                <div className="text-xs text-white/60 font-medium mt-1 truncate">
                  {game.developer?.name || game.publisher?.name || 'Commodore 64'}
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
