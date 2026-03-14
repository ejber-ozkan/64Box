"use client";

import React, { useEffect, useState } from 'react';
import { Game } from '../types/game';
import { useSettings } from '../contexts/SettingsContext';
import { DigitalMuseumLayout } from './themes/DigitalMuseumLayout';
import { ImageSlider } from './ImageSlider';
import { ConsoleHeroLayout } from './themes/ConsoleHeroLayout';
import { SteamLibraryLayout } from './themes/SteamLibraryLayout';
import { useDetailNavigation, DetailNavigationHook, NavigationConfig } from '../hooks/useDetailNavigation';
import { useInputMode } from '../hooks/useInputMode';
import { useGamepad } from '../hooks/useGamepad';
import { useFavorites } from '../hooks/useFavorites';

interface DetailViewProps {
  game: Game;
  onBack: () => void;
}

export interface DetailLayoutProps {
  game: Game;
  onBack: () => void;
  nav: DetailNavigationHook;
  onFullscreen: (filename: string | null) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

const DIGITAL_MUSEUM_CONFIG: NavigationConfig = {
  'play':              { up: 'favorite', right: 'screenshot', down: 'play-web' },
  'play-web':          { up: 'play', right: 'screenshot', down: 'media-gameplay' },
  'favorite':          { down: 'play' },
  'media-gameplay':    { up: 'play-web', right: 'screenshot', down: 'media-extras' },
  'media-extras':      { up: 'media-gameplay', right: 'screenshot', down: 'media-titlescreen' },
  'media-titlescreen': { up: 'media-extras', right: 'screenshot', down: 'media-videosna' },
  'media-videosna':    { up: 'media-titlescreen', right: 'screenshot', down: 'media-boxfront' },
  'media-boxfront':    { up: 'media-videosna', right: 'screenshot' },
  'screenshot':        { left: 'media-gameplay', right: 'sid' },
  'sid':               { left: 'screenshot', up: 'play-web' },
};

const CONSOLE_HERO_CONFIG: NavigationConfig = {
  'media-gameplay':    { up: 'favorite', down: 'play', right: 'media-extras' },
  'play':              { up: 'favorite', right: 'play-web', down: 'sid' },
  'play-web':          { up: 'media-gameplay', left: 'play', down: 'sid' },
  'favorite':          { down: 'media-gameplay' },
  'media-extras':      { left: 'media-gameplay', right: 'media-titlescreen' },
  'media-titlescreen': { left: 'media-extras', right: 'media-boxfront' },
  'media-boxfront':    { left: 'media-titlescreen' },
  'sid':               { left: 'media-gameplay', up: 'play' },
  'screenshot':        { down: 'play' },
  'media-videosna':    { right: 'play', down: 'media-extras' },
};

const STEAM_LIBRARY_CONFIG: NavigationConfig = {
  'play':              { up: 'favorite', right: 'media-gameplay', down: 'play-web' },
  'play-web':          { up: 'play', right: 'media-gameplay', down: 'sid' },
  'favorite':          { down: 'play', left: 'play' },
  'media-gameplay':    { up: 'favorite', right: 'media-extras', down: 'sid' },
  'media-extras':      { up: 'play', left: 'media-gameplay', right: 'media-titlescreen', down: 'sid' },
  'media-titlescreen': { up: 'play', left: 'media-extras', down: 'sid' },
  'sid':               { up: 'media-gameplay' },
  'screenshot':        { down: 'sid' },
  'media-videosna':    { right: 'media-extras', down: 'sid' },
  'media-boxfront':    { right: 'play' },
};

export function DetailView({ game, onBack }: DetailViewProps) {
  const { settings } = useSettings();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const { showMouse } = useInputMode();
  const favorited = isFavorite(game.id.toString());

  const theme = settings.detailViewTheme || 'cia';
  const config = theme === 'vic' ? CONSOLE_HERO_CONFIG : 
                 theme === 'sx64' ? STEAM_LIBRARY_CONFIG : 
                 DIGITAL_MUSEUM_CONFIG;

  const nav = useDetailNavigation({ onBack, config, enabled: !fullscreenImage });
  const hasBlockingModal = () => typeof document !== 'undefined' && Boolean(document.querySelector('[data-detail-modal="open"]'));

  useGamepad({
    onButtonDown: (button) => {
      if (fullscreenImage && button === 'B') {
        setFullscreenImage(null);
      }
      if (!fullscreenImage && !hasBlockingModal() && button === 'Y') {
        toggleFavorite(game.id.toString());
      }
    },
  });

  useEffect(() => {
    if (!fullscreenImage) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault();
        setFullscreenImage(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenImage]);

  useEffect(() => {
    nav.registerAction('favorite', () => toggleFavorite(game.id.toString()));
  }, [game.id, nav, toggleFavorite]);

  useEffect(() => {
    if (fullscreenImage) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (hasBlockingModal()) return;

      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        toggleFavorite(game.id.toString());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenImage, game.id, toggleFavorite]);

  const renderTheme = () => {
    const props = {
      game,
      onBack,
      nav,
      onFullscreen: setFullscreenImage,
      isFavorite: favorited,
      onToggleFavorite: () => toggleFavorite(game.id.toString()),
    };
    switch (theme) {
      case 'vic':   return <ConsoleHeroLayout {...props} />;
      case 'sx64':  return <SteamLibraryLayout {...props} />;
      default:      return <DigitalMuseumLayout {...props} />;
    }
  };

  return (
    <div className="relative h-full w-full">
      {!fullscreenImage && theme !== 'sx64' && (
        <button
          onClick={() => toggleFavorite(game.id.toString())}
          onMouseEnter={() => nav.hoverZone('favorite')}
          className={`fixed right-6 top-20 z-[80] flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] shadow-2xl backdrop-blur-md transition-all ${
            favorited
              ? 'border-pink-300/70 bg-pink-500/20 text-pink-200'
              : 'border-white/15 bg-black/40 text-white/70 hover:border-pink-300/50 hover:text-pink-200'
          } ${nav.focusCls('favorite')}`}
          title={favorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <span className="text-base leading-none">{favorited ? '♥' : '♡'}</span>
          <span className="hidden sm:inline">{favorited ? 'Favorite' : 'Favorite'}</span>
        </button>
      )}
      {renderTheme()}
      
      {fullscreenImage && (
        <div 
          data-detail-modal="open"
          className={`fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-8 backdrop-blur-md animate-in fade-in zoom-in duration-300 transition-all ${
             showMouse ? 'cursor-pointer' : 'cursor-none'
          }`}
          onClick={() => setFullscreenImage(null)}
        >
          <div
            className="relative h-[min(92vh,1400px)] w-[min(96vw,2200px)] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <ImageSlider
              type="screenshot"
              filename={fullscreenImage}
              alt="Fullscreen View"
              className="h-full w-full object-contain shadow-2xl rounded-lg border border-white/10"
            />
            {showMouse && (
              <>
                <button
                  className="absolute top-0 right-0 p-4 text-white text-4xl font-light hover:text-yellow-400 transition-colors"
                  onClick={() => setFullscreenImage(null)}
                >
                  ×
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-full text-xs text-white/70 border border-white/10 backdrop-blur-sm">
                    Click anywhere to close
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
