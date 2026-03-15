"use client";

import { DetailNavigationHook } from '../../../hooks/useDetailNavigation';
import { Game } from '../../../types/game';
import { DetailGameTitle } from '../../detail/DetailGameTitle';

interface SteamHeroProps {
  game: Game;
  isFavorite: boolean;
  nav: DetailNavigationHook;
  onToggleFavorite: () => void;
  screenshotUrl: string;
  studios: string[];
}

export function SteamHero({
  game,
  isFavorite,
  nav,
  onToggleFavorite,
  screenshotUrl,
  studios,
}: SteamHeroProps) {
  return (
    <div className="relative shrink-0 border-b border-[#2a475e] bg-[#0f1922] px-8 py-6 xl:px-10 xl:py-7 transition-all">
      <div
        className="absolute inset-0 opacity-20 transition-opacity duration-1000"
        style={{
          backgroundImage: screenshotUrl ? `url(${screenshotUrl})` : '',
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          filter: 'saturate(0)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1b2838] to-transparent z-10" />

      <div className="relative z-20 flex items-start gap-4 xl:gap-5">
        <button
          onClick={onToggleFavorite}
          onMouseEnter={() => nav.hoverZone('favorite')}
          className={`mt-1 inline-flex h-11 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-semibold uppercase tracking-[0.18em] transition-all ${
            isFavorite
              ? 'border-pink-300/70 bg-pink-500/20 text-pink-200'
              : 'border-white/15 bg-black/40 text-white/70 hover:border-pink-300/50 hover:text-pink-200'
          } ${nav.focusCls('favorite')}`}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <span className="text-base leading-none">{isFavorite ? '♥' : '♡'}</span>
        </button>
        <div className="min-w-0 flex-1">
          <DetailGameTitle
            className="mb-2 flex flex-wrap items-center gap-3 text-2xl font-light tracking-tight text-white xl:text-3xl 2xl:text-4xl"
            title={game.name}
          />
          <div className="flex flex-wrap items-center gap-y-2 text-xs xl:text-sm font-semibold uppercase tracking-wider text-[#66c0f4]">
            {[game.year, ...studios].filter(Boolean).map((value, index, values) => (
              <span key={`${value}-${index}`}>
                {value}
                {index < values.length - 1 && <span className="mx-2 text-[#3d4450]">•</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
