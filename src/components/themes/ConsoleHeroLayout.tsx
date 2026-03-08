"use client";

import { useEffect } from 'react';
import { Game } from '../../types/game';
import { useSettings } from '../../contexts/SettingsContext';
import { ImageSlider } from '../ImageSlider';
import { SidPlayer } from '../SidPlayer';
import { PlayButton } from './PlayButton';
import { DetailLayoutProps } from '../DetailView';

export function ConsoleHeroLayout({ game, onBack, nav, onFullscreen }: DetailLayoutProps) {
  const { resolveMediaPath } = useSettings();

  const activeBg = game.videoSnapFilename 
    ? resolveMediaPath('screenshot', game.videoSnapFilename) 
    : (game.screenshotFilename ? resolveMediaPath('screenshot', game.screenshotFilename) : '');

  // Register theme actions
  useEffect(() => {
    nav.registerAction('play', () => document.getElementById('play-game-btn')?.click());
    nav.registerAction('play-web', () => document.getElementById('play-browser-btn')?.click());
    nav.registerAction('sid', () => document.getElementById('sid-play-btn')?.click());
    
    // Controller 'A' for fullscreen
    nav.registerAction('media-gameplay', () => onFullscreen(game.screenshotFilename));
    nav.registerAction('media-titlescreen', () => onFullscreen(game.titlescreenFilename));
    nav.registerAction('media-boxfront', () => onFullscreen(game.boxFrontFilename));
  }, [nav, onFullscreen, game]);

  const zoneLabels: Record<string, string> = {
    play: '▶ Play Desktop [A]',
    'play-web': '▶ Play Browser [A]',
    sid: '🎵 SID Music [A]',
    'media-gameplay': '🕹️ Gameplay [A]',
    'media-titlescreen': '🖼️ Title [A]',
    'media-boxfront': '📦 Box Art [A]',
  };

  return (
    <div className="relative flex flex-col h-full bg-black overflow-hidden group">
      {/* Immersive Background Blur */}
      <div 
        className="absolute inset-0 opacity-40 blur-3xl scale-110 transition-opacity duration-1000"
        style={{ 
          backgroundImage: `url(${activeBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent" />

      {/* Top Nav + Debug Header */}
      <div className="relative p-6 z-20 flex justify-between items-center bg-black/20 backdrop-blur-sm border-b border-white/5">
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-full text-white font-semibold transition-all shadow-lg flex items-center gap-2"
        >
          <span>←</span> Back
        </button>

        {/* Controller status bar (Consistent with current design) */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-400 hidden sm:inline">Controller Support Active</span>
          <span className="px-4 py-1.5 bg-blue-600/30 border border-blue-400/50 text-blue-200 font-bold rounded-full animate-pulse min-w-[150px] text-center">
            {zoneLabels[nav.focusedZone] ?? nav.focusedZone}
          </span>
          <span className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/60 rounded-full font-mono text-[10px] min-w-[120px] text-center lowercase">
             {nav.lastAction}
          </span>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 overflow-hidden px-12 pb-12 gap-12 max-w-[1800px] mx-auto w-full">
        {/* Left Side: Massive Gameplay/Video Stage */}
        <div className="flex-1 flex flex-col justify-end">
           {/* Primary Video / Image */}
           <div 
             onClick={() => onFullscreen(game.screenshotFilename)}
             onMouseEnter={() => nav.hoverZone('media-gameplay')}
             className={`aspect-video w-full rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 mb-8 bg-black transition-all cursor-pointer group/media ${nav.focusCls('media-gameplay')}`}
           >
              {game.videoSnapFilename ? (
                <video 
                   src={resolveMediaPath('screenshot', game.videoSnapFilename)} 
                   autoPlay loop muted 
                   className="w-full h-full object-cover"
                />
              ) : (
                <ImageSlider
                  type="screenshot"
                  filename={game.screenshotFilename}
                  alt={`${game.name} Gameplay`}
                  className="w-full h-full object-cover"
                />
              )}
           </div>

           {/* Carousel Strip */}
           <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
              <div 
                onClick={() => onFullscreen(game.titlescreenFilename)}
                onMouseEnter={() => nav.hoverZone('media-titlescreen')}
                className={`h-32 w-48 shrink-0 bg-white/5 rounded-xl border border-white/10 p-2 overflow-hidden hover:ring-2 ring-blue-500 transition-all cursor-pointer ${nav.focusCls('media-titlescreen')}`}
              >
                 <ImageSlider type="screenshot" filename={game.titlescreenFilename} alt="Title" className="w-full h-full object-contain pointer-events-none" fallbackText="Title Screen" />
              </div>
              <div 
                onClick={() => onFullscreen(game.boxFrontFilename)}
                onMouseEnter={() => nav.hoverZone('media-boxfront')}
                className={`h-32 w-24 shrink-0 bg-white/5 rounded-xl border border-white/10 p-2 overflow-hidden hover:ring-2 ring-blue-500 transition-all cursor-pointer ${nav.focusCls('media-boxfront')}`}
              >
                 <ImageSlider type="screenshot" filename={game.boxFrontFilename} alt="Box Art" className="w-full h-full object-contain pointer-events-none" fallbackText="Box Art" />
              </div>
           </div>
        </div>

        {/* Right Side: Frosted Glass Metadata Panel */}
        <div className="w-[400px] flex flex-col shrink-0 gap-6">
           <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl flex-1 flex flex-col transform transition translate-y-4 group-hover:translate-y-0 duration-700">
              <h1 className="text-5xl font-black text-white mb-2 leading-tight">{game.name}</h1>
              <div className="text-blue-400 font-semibold text-lg mb-8">{game.year || 'Unknown Year'} • {game.developer?.name || 'Unknown Developer'}</div>
              
              <div className="space-y-4 mb-8">
                 <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className="text-gray-400">Genre</span>
                    <span className="text-white font-medium">{game.parentGenre} / {game.subGenre}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className="text-gray-400">Publisher</span>
                    <span className="text-white font-medium">{game.publisher?.name || '-'}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className="text-gray-400">Musician</span>
                    <span className="text-white font-medium">{game.musician?.name || '-'}</span>
                 </div>
              </div>

              <div className="mt-auto flex flex-col gap-5">
                 <PlayButton game={game} nav={nav} />
                 
                 <div 
                    onMouseEnter={() => nav.hoverZone('sid')}
                    className={`rounded-xl transition-all ${nav.focusCls('sid')}`}
                 >
                    <SidPlayer filename={game.sidFilename} />
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
