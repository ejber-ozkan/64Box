"use client";

import React, { useState } from 'react';
import { Game } from '../types/game';
import { useSettings } from '../contexts/SettingsContext';
import { DigitalMuseumLayout } from './themes/DigitalMuseumLayout';
import { ImageSlider } from './ImageSlider';
import { ConsoleHeroLayout } from './themes/ConsoleHeroLayout';
import { SteamLibraryLayout } from './themes/SteamLibraryLayout';
import { useDetailNavigation, DetailNavigationHook, NavigationConfig } from '../hooks/useDetailNavigation';

interface DetailViewProps {
  game: Game;
  onBack: () => void;
}

export interface DetailLayoutProps {
  game: Game;
  onBack: () => void;
  nav: DetailNavigationHook;
  onFullscreen: (filename: string | null) => void;
}

const DIGITAL_MUSEUM_CONFIG: NavigationConfig = {
  'media-videosna':    { right: 'screenshot', down: 'media-titlescreen' },
  'media-titlescreen': { right: 'screenshot', up: 'media-videosna', down: 'media-gameplay' },
  'media-gameplay':    { right: 'screenshot', up: 'media-titlescreen', down: 'media-boxfront' },
  'media-boxfront':    { right: 'screenshot', up: 'media-gameplay', down: 'media-extras' },
  'media-extras':      { right: 'screenshot', up: 'media-boxfront' },
  'screenshot':        { left: 'media-gameplay', right: 'play' },
  'play':              { left: 'screenshot', right: 'play-web', down: 'sid' },
  'play-web':          { left: 'play', down: 'sid' },
  'sid':               { left: 'screenshot', up: 'play' },
};

const CONSOLE_HERO_CONFIG: NavigationConfig = {
  'media-gameplay':    { down: 'media-titlescreen', right: 'play' },
  'media-titlescreen': { up: 'media-gameplay', right: 'media-boxfront' },
  'media-boxfront':    { left: 'media-titlescreen', right: 'play', up: 'media-gameplay' },
  'play':              { left: 'media-gameplay', right: 'play-web', down: 'sid' },
  'play-web':          { left: 'play', down: 'sid' },
  'sid':               { left: 'media-gameplay', up: 'play' },
  'screenshot':        { left: 'media-gameplay', right: 'play' }, // fallback
  'media-videosna':    { right: 'play', down: 'media-titlescreen' },
  'media-extras':      { up: 'media-boxfront', left: 'media-gameplay' },
};

const STEAM_LIBRARY_CONFIG: NavigationConfig = {
  'play':              { right: 'play-web', down: 'media-gameplay', left: 'media-gameplay' },
  'play-web':          { left: 'play', down: 'media-gameplay' },
  'media-gameplay':    { up: 'play', right: 'media-titlescreen', down: 'sid' },
  'media-titlescreen': { up: 'play', left: 'media-gameplay', down: 'sid' },
  'sid':               { up: 'media-gameplay' },
  'screenshot':        { down: 'sid' },
  'media-videosna':    { right: 'media-titlescreen', down: 'sid' },
  'media-boxfront':    { right: 'play' },
  'media-extras':      { up: 'media-boxfront', left: 'media-gameplay' },
};

export function DetailView({ game, onBack }: DetailViewProps) {
  const { settings } = useSettings();
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  const theme = settings.detailViewTheme || 'cia';
  const config = theme === 'vic' ? CONSOLE_HERO_CONFIG : 
                 theme === 'sx64' ? STEAM_LIBRARY_CONFIG : 
                 DIGITAL_MUSEUM_CONFIG;

  const nav = useDetailNavigation({ onBack, config });

  const renderTheme = () => {
    const props = { game, onBack, nav, onFullscreen: setFullscreenImage };
    switch (theme) {
      case 'vic':   return <ConsoleHeroLayout {...props} />;
      case 'sx64':  return <SteamLibraryLayout {...props} />;
      default:      return <DigitalMuseumLayout {...props} />;
    }
  };

  return (
    <div className="relative h-full w-full">
      {renderTheme()}
      
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-8 backdrop-blur-md cursor-pointer animate-in fade-in zoom-in duration-300"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
            <ImageSlider
              type="screenshot"
              filename={fullscreenImage}
              alt="Fullscreen View"
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-white/10"
            />
            <button className="absolute top-0 right-0 p-4 text-white text-4xl font-light hover:text-yellow-400 transition-colors">×</button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-full text-xs text-white/70 border border-white/10 backdrop-blur-sm">
                Click anywhere to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
