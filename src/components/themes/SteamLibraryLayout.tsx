"use client";

import { useEffect } from 'react';
import { Game } from '../../types/game';
import { useSettings } from '../../contexts/SettingsContext';
import { ImageWithFallback } from '../ImageWithFallback';
import { ImageSlider } from '../ImageSlider';
import { SidPlayer } from '../SidPlayer';
import { PlayButton } from './PlayButton';
import { DetailLayoutProps } from '../DetailView';

export function SteamLibraryLayout({ game, onBack, nav, onFullscreen }: DetailLayoutProps) {
  const { resolveMediaPath } = useSettings();

  // Register theme actions
  useEffect(() => {
    nav.registerAction('play', () => document.getElementById('play-game-btn')?.click());
    nav.registerAction('play-web', () => document.getElementById('play-browser-btn')?.click());
    nav.registerAction('sid', () => document.getElementById('sid-play-btn')?.click());
    
    // Controller 'A' for fullscreen
    nav.registerAction('media-gameplay', () => onFullscreen(game.screenshotFilename));
    nav.registerAction('media-titlescreen', () => onFullscreen(game.titlescreenFilename));
  }, [nav, onFullscreen, game]);

  const zoneLabels: Record<string, string> = {
    play: '▶ Play Desktop [A]',
    'play-web': '▶ Play Browser [A]',
    sid: '🎵 Sid Player [A]',
    'media-gameplay': '🕹️ Gameplay Gallery [A]',
    'media-titlescreen': '🖼️ Title Gallery [A]',
  };

  return (
    <div className="flex flex-col h-full bg-[#1b2838] text-[#c6d4df] font-sans overflow-hidden">
      
      {/* Top Header / Mode Bar (Modified for consistency) */}
      <div className="bg-[#171d24] px-6 py-2 border-b border-[#2a475e]/30 flex justify-between items-center z-30">
        <button
          onClick={onBack}
          className="px-4 py-1.5 bg-[#2a475e] hover:bg-[#66c0f4] hover:text-white rounded-sm text-[#c6d4df] text-sm uppercase transition-colors"
        >
          ← Library
        </button>

        {/* Debug Status bar (Steam style) */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#3d4450] uppercase font-bold text-[10px]">Controller Mode</span>
          <span className="px-3 py-1 bg-[#2a475e] border border-[#66c0f4]/50 text-[#66c0f4] font-bold rounded-sm animate-pulse min-w-[140px] text-center uppercase tracking-tighter">
            {zoneLabels[nav.focusedZone] ?? nav.focusedZone}
          </span>
          <span className="px-3 py-1 bg-black/40 text-gray-500 rounded-sm font-mono text-[9px] min-w-[100px] text-center lowercase border border-white/5">
             {nav.lastAction}
          </span>
          <span className="text-[#3d4450] uppercase font-bold text-[10px] ml-2">B Back</span>
        </div>
      </div>

      {/* Top Banner section */}
      <div className="relative h-64 border-b border-[#2a475e] shrink-0 bg-[#0f1922] overflow-hidden flex items-end p-6 gap-6">
        <div 
           className="absolute inset-0 opacity-20 transition-opacity duration-1000"
           style={{ 
             backgroundImage: game.screenshotFilename ? `url(${resolveMediaPath('screenshot', game.screenshotFilename)})` : '',
             backgroundSize: 'cover',
             backgroundPosition: 'top center',
             filter: 'saturate(0)'
           }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1b2838] to-transparent z-10" />
        
        <div 
          onClick={() => onFullscreen(game.boxFrontFilename)}
          className="relative z-20 h-48 w-36 shrink-0 rounded shadow-[0_4px_16px_rgba(0,0,0,0.8)] bg-black border border-[#2a475e] group cursor-pointer hover:border-[#66c0f4] transition-colors"
        >
          <ImageWithFallback src={game.boxFrontFilename ? resolveMediaPath('screenshot', game.boxFrontFilename) : ''} alt="Box Art" className="w-full h-full object-contain pointer-events-none" fallbackText="Box Front" />
        </div>

        <div className="relative z-20 pb-4 flex-1">
          <h1 className="text-4xl font-light text-white mb-2">{game.name}</h1>
          <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-[#66c0f4]">
            {game.developer?.name || 'Unknown'} <span>•</span> {game.publisher?.name || 'Unknown'} <span>•</span> {game.year || '----'}
          </div>
        </div>

        <div className="relative z-20 pb-4 flex flex-col items-end shrink-0 w-[400px]">
          <PlayButton game={game} nav={nav} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 max-w-[1200px] w-full mx-auto flex gap-8">
        
        {/* Left column (Tabs & Info) */}
        <div className="w-2/3 flex flex-col gap-8">
           <div className="flex gap-1 border-b border-[#2a475e]">
              <div className="px-4 py-2 text-white border-b-2 border-[#66c0f4] font-medium text-lg uppercase shadow-sm">Gallery</div>
              <div className="px-4 py-2 text-gray-500 hover:text-white cursor-pointer font-medium text-lg uppercase transition-colors">Details</div>
              <div className="px-4 py-2 text-gray-500 hover:text-white cursor-pointer font-medium text-lg uppercase transition-colors">Documents</div>
           </div>

           {/* Gallery */}
           <div className="grid grid-cols-2 gap-4">
              <div 
                onClick={() => onFullscreen(game.screenshotFilename)}
                onMouseEnter={() => nav.hoverZone('media-gameplay')}
                className={`aspect-video bg-[#0f1922] rounded shadow-md border border-[#2a475e] flex items-center justify-center p-2 transition cursor-pointer relative group ${nav.focusCls('media-gameplay')}`}
              >
                {game.videoSnapFilename ? (
                   <video src={resolveMediaPath('screenshot', game.videoSnapFilename)} autoPlay loop muted className="w-full h-full object-contain pointer-events-none" />
                ) : (
                   <ImageSlider type="screenshot" filename={game.screenshotFilename} alt="Screenshot" className="w-full h-full object-contain pointer-events-none" fallbackText="Gameplay" />
                )}
                <div className="absolute top-2 left-2 bg-black/80 px-2 rounded text-[10px] text-white">Main</div>
              </div>
              <div 
                 onClick={() => onFullscreen(game.titlescreenFilename)}
                 onMouseEnter={() => nav.hoverZone('media-titlescreen')}
                 className={`aspect-video bg-[#0f1922] rounded shadow-md border border-[#2a475e] flex items-center justify-center p-2 transition cursor-pointer relative ${nav.focusCls('media-titlescreen')}`}
              >
                 <ImageWithFallback src={game.titlescreenFilename ? resolveMediaPath('screenshot', game.titlescreenFilename) : ''} alt="Title" className="w-full h-full object-contain pointer-events-none" fallbackText="Title Screen" />
                 <div className="absolute top-2 left-2 bg-black/80 px-2 rounded text-[10px] text-white">Title</div>
              </div>
           </div>
        </div>

        {/* Right column (Metadata & SID) */}
        <div className="w-1/3 flex flex-col gap-6">
           <div className="bg-[#0f1922]/80 border border-[#2a475e] rounded p-4 text-sm flex flex-col gap-3">
              <h3 className="uppercase text-[#66c0f4] border-b border-[#2a475e] pb-1 font-semibold">Game Info</h3>
              <div className="grid grid-cols-[100px_1fr] gap-1">
                 <span className="text-gray-500">Genre:</span> <span className="text-white">{game.parentGenre}</span>
                 <span className="text-gray-500">Sub-genre:</span> <span className="text-white">{game.subGenre}</span>
                 <span className="text-gray-500">System:</span> <span className="text-white">{game.isPal && 'PAL'} {game.isNtsc && 'NTSC'}</span>
                 <span className="text-gray-500">Musician:</span> <span className="text-[#66c0f4] hover:underline cursor-pointer">{game.musician?.name || '-'}</span>
              </div>
           </div>
           
           <div 
             onMouseEnter={() => nav.hoverZone('sid')}
             className={`bg-[#0f1922]/80 border border-[#2a475e] rounded p-4 flex flex-col gap-3 transition-all ${nav.focusCls('sid')}`}
           >
              <h3 className="uppercase text-[#66c0f4] border-b border-[#2a475e] pb-1 text-sm font-semibold">Soundtrack Module</h3>
              <SidPlayer 
                 filename={game.sidFilename} 
              />
           </div>
        </div>

      </div>
    </div>
  );
}
