"use client";

import { useEffect, useState } from 'react';
import { Game } from '../types/game';
import { NeonArchiveDetailLayout } from './themes/neon-archive/NeonArchiveDetailLayout';
import { ImageSlider } from './ImageSlider';
import { ImageWithFallback } from './ImageWithFallback';
import { useDetailNavigation, DetailNavigationHook, NavigationConfig } from '../hooks/useDetailNavigation';
import { useInputMode } from '../hooks/useInputMode';
import { useGamepad } from '../hooks/useGamepad';
import { useFavorites } from '../hooks/useFavorites';
import { usePopupOpenSound } from '../hooks/usePopupOpenSound';
import { FullscreenLayoutMetrics, useFullscreenLayoutMetrics } from '../hooks/useFullscreenLayoutMetrics';

interface DetailViewProps {
  game: Game;
  onBack: () => void;
}

export interface DetailLayoutProps {
  game: Game;
  onBack: () => void;
  nav: DetailNavigationHook;
  onFullscreen: (media: DetailFullscreenRequest) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  fullscreenLayout?: FullscreenLayoutMetrics;
}

export type DetailFullscreenMedia =
  | { kind: 'screenshot'; filename: string }
  | { kind: 'image-url'; url: string; alt?: string };

export type DetailFullscreenRequest = string | DetailFullscreenMedia | null;

const DETAIL_CONFIG: NavigationConfig = {
  'favorite':          { down: 'play' },
  'play':              { up: 'favorite', right: 'media-boxfront', down: 'play-web' },
  'play-web':          { up: 'play', left: 'media-boxfront', down: 'versions' },
  'media-gameplay':    { up: 'favorite', right: 'media-boxfront', down: 'versions' },
  'media-titlescreen': { up: 'favorite', right: 'media-boxfront', down: 'versions' },
  'media-videosna':    { up: 'favorite', right: 'media-boxfront', down: 'versions' },
  'media-boxfront':    { up: 'favorite', left: 'media-gameplay', right: 'versions', down: 'versions' },
  'media-extras':      { up: 'media-boxfront', left: 'play-web', right: 'sid' },
  'versions':          { up: 'play-web', left: 'media-boxfront', down: 'sid' },
  'sid':               { up: 'versions', left: 'media-boxfront' },
  'screenshot':        { left: 'media-boxfront', down: 'sid' },
};

export function DetailView({ game, onBack }: DetailViewProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [fullscreenMedia, setFullscreenMedia] = useState<DetailFullscreenMedia | null>(null);
  const { showMouse } = useInputMode();
  const favorited = isFavorite(game.id.toString());
  usePopupOpenSound(Boolean(fullscreenMedia), 'detail-fullscreen-image');

  const fullscreenLayout = useFullscreenLayoutMetrics();
  const nav = useDetailNavigation({ onBack, config: DETAIL_CONFIG, enabled: !fullscreenMedia });
  const hasBlockingModal = () => typeof document !== 'undefined' && Boolean(document.querySelector('[data-detail-modal="open"]'));

  const handleFullscreen = (media: DetailFullscreenRequest) => {
    if (!media) {
      setFullscreenMedia(null);
      return;
    }

    if (typeof media === 'string') {
      setFullscreenMedia({ kind: 'screenshot', filename: media });
      return;
    }

    setFullscreenMedia(media);
  };

  useGamepad({
    onButtonDown: (button) => {
      if (fullscreenMedia && button === 'B') {
        setFullscreenMedia(null);
      }
      if (!fullscreenMedia && !hasBlockingModal() && button === 'Y') {
        toggleFavorite(game.id.toString());
      }
    },
  });

  useEffect(() => {
    if (!fullscreenMedia) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault();
        setFullscreenMedia(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenMedia]);

  useEffect(() => {
    nav.registerAction('favorite', () => toggleFavorite(game.id.toString()));
  }, [game.id, nav, toggleFavorite]);

  useEffect(() => {
    if (fullscreenMedia) {
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
  }, [fullscreenMedia, game.id, toggleFavorite]);

  const renderTheme = () => {
    return (
      <NeonArchiveDetailLayout
        key={game.id}
        game={game}
        onBack={onBack}
        nav={nav}
        onFullscreen={handleFullscreen}
        isFavorite={favorited}
        onToggleFavorite={() => toggleFavorite(game.id.toString())}
        fullscreenLayout={fullscreenLayout}
      />
    );
  };

  return (
    <div className="relative h-full w-full">
      {renderTheme()}
      
      {fullscreenMedia && (
        <div 
          data-detail-modal="open"
          className={`fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-8 backdrop-blur-md animate-in fade-in zoom-in duration-300 transition-all ${
             showMouse ? 'cursor-pointer' : 'cursor-none'
          }`}
          onClick={() => setFullscreenMedia(null)}
        >
          <div
            className="relative h-[min(92vh,1400px)] w-[min(96vw,2200px)] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {fullscreenMedia.kind === 'screenshot' ? (
              <ImageSlider
                type="screenshot"
                filename={fullscreenMedia.filename}
                alt="Fullscreen View"
                className="h-full w-full object-contain shadow-2xl rounded-lg border border-white/10"
              />
            ) : (
              <ImageWithFallback
                src={fullscreenMedia.url}
                alt={fullscreenMedia.alt ?? 'Fullscreen View'}
                fit="contain"
                className="h-full w-full shadow-2xl rounded-lg border border-white/10"
              />
            )}
            {showMouse && (
              <>
                <button
                  className="absolute top-0 right-0 p-4 text-white text-4xl font-light hover:text-yellow-400 transition-colors"
                  onClick={() => setFullscreenMedia(null)}
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
