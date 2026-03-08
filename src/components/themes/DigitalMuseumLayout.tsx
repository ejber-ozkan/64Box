"use client";

import { useState, useEffect } from 'react';
import { Game } from '../../types/game';
import { useSettings } from '../../contexts/SettingsContext';
import { ImageSlider } from '../ImageSlider';
import { SidPlayer } from '../SidPlayer';
import { PlayButton } from './PlayButton';
import { DetailLayoutProps } from '../DetailView';

export function DigitalMuseumLayout({ game, onBack, nav, onFullscreen }: DetailLayoutProps) {
  const { resolveMediaPath } = useSettings();
  const [activeMedia, setActiveMedia] = useState<'gameplay' | 'titlescreen' | 'videosna' | 'boxfront'>('gameplay');

  // Map media types to navigation zones
  const mediaToZone: Record<string, any> = {
    gameplay: 'media-gameplay',
    titlescreen: 'media-titlescreen',
    videosna: 'media-videosna',
    boxfront: 'media-boxfront',
  };

  // Register theme actions
  useEffect(() => {
    nav.registerAction('play', () => {
      const btn = document.getElementById('play-game-btn');
      console.log('[Theme] Activating play button:', btn);
      btn?.click();
    });
    nav.registerAction('play-web', () => {
      const btn = document.getElementById('play-browser-btn');
      console.log('[Theme] Activating Web play button:', btn);
      btn?.click();
    });
    nav.registerAction('sid', () => {
      const btn = document.getElementById('sid-play-btn');
      console.log('[Theme] Activating sid button:', btn);
      btn?.click();
    });
    nav.registerAction('screenshot', () => {
      onFullscreen(activeMedia === 'videosna' ? game.screenshotFilename : // fallback if it's video
                    activeMedia === 'gameplay' ? game.screenshotFilename :
                    activeMedia === 'titlescreen' ? game.titlescreenFilename :
                    game.boxFrontFilename);
    });
    
    // Media tab actions
    nav.registerAction('media-gameplay', () => setActiveMedia('gameplay'));
    nav.registerAction('media-titlescreen', () => setActiveMedia('titlescreen'));
    nav.registerAction('media-videosna', () => setActiveMedia('videosna'));
    nav.registerAction('media-boxfront', () => setActiveMedia('boxfront'));
  }, [nav]);

  const zoneLabels: Record<string, string> = {
    play: '▶ Play Game [A]',
    sid: '🎵 SID Music [A]',
    screenshot: '🔍 View Fullscreen [A]',
    'media-gameplay': '🖼️ Gameplay [A]',
    'media-titlescreen': '🖼️ Title [A]',
    'media-videosna': '🎥 Video [A]',
    'media-boxfront': '📦 Box Art [A]',
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100 font-sans selection:bg-yellow-500/30">
      {/* Top Header / Mode Bar */}
      <div className="bg-gray-900 px-6 py-3 border-b border-gray-800 flex justify-between items-center z-30 shadow-xl">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 hover:text-white rounded text-gray-300 font-medium transition-colors text-sm uppercase tracking-wider"
        >
          ← Back to Library
        </button>

        {/* Controller status bar */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-600 hidden md:inline">◀▶ Select [A] Accept</span>
          <span className="px-3 py-1 bg-yellow-900/40 border border-yellow-500/50 text-yellow-300 font-bold rounded-full animate-pulse min-w-[140px] text-center">
            {zoneLabels[nav.focusedZone] ?? nav.focusedZone}
          </span>
          <span className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-400 rounded-full font-mono text-[10px] min-w-[100px] text-center lowercase">
             {nav.lastAction}
          </span>
          <span className="text-gray-600">B Back</span>
        </div>
      </div>



      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Media Selector */}
        <div className="w-64 bg-gray-900/50 border-r border-gray-800 flex flex-col p-4 gap-4 overflow-y-auto custom-scrollbar">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-2">Collection Media</div>
          
          {(['gameplay', 'titlescreen', 'videosna', 'boxfront'] as const).map((type) => {
            const zone = mediaToZone[type] as any;
            return (
              <button
                key={type}
                onClick={() => { setActiveMedia(type); nav.setFocusedZone(zone); }}
                onMouseEnter={() => nav.hoverZone(zone)}
                className={`p-3 rounded-lg flex flex-col items-center gap-2 border transition-all ${
                  activeMedia === type
                    ? 'bg-gray-800 border-yellow-500/50 text-white shadow-lg'
                    : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'
                } ${nav.focusCls(zone)}`}
              >
                <div className="text-sm font-semibold capitalize">{type}</div>
              </button>
            );
          })}
        </div>

        {/* Center: Main Stage */}
        <div className="flex-1 flex flex-col p-8 gap-8 overflow-y-auto custom-scrollbar bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.05),transparent_70%)]">
          
          <div 
            onClick={() => onFullscreen(activeMedia === 'videosna' ? game.screenshotFilename : (activeMedia === 'gameplay' ? game.screenshotFilename : activeMedia === 'titlescreen' ? game.titlescreenFilename : game.boxFrontFilename))}
            onMouseEnter={() => nav.hoverZone('screenshot')}
            className={`relative flex-1 min-h-[400px] bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800 group/stage transition-all cursor-pointer ${nav.focusCls('screenshot')}`}
          >
            {activeMedia === 'videosna' && game.videoSnapFilename ? (
              <video 
                src={resolveMediaPath('screenshot', game.videoSnapFilename)} 
                autoPlay loop muted 
                className="w-full h-full object-contain"
              />
            ) : (
              <ImageSlider
                type="screenshot"
                filename={activeMedia === 'gameplay' ? game.screenshotFilename :
                          activeMedia === 'titlescreen' ? game.titlescreenFilename :
                          activeMedia === 'boxfront' ? game.boxFrontFilename : game.screenshotFilename}
                alt={game.name}
                className="w-full h-full object-contain"
              />
            )}

            {/* Screenshot expand button */}
            <button
              onClick={() => onFullscreen(activeMedia === 'videosna' ? game.screenshotFilename : (activeMedia === 'gameplay' ? game.screenshotFilename : activeMedia === 'titlescreen' ? game.titlescreenFilename : game.boxFrontFilename))}
              onMouseEnter={() => nav.hoverZone('screenshot')}
              className="absolute top-3 right-3 z-20 px-3 py-2 bg-black/60 hover:bg-black/80 text-white text-xs rounded border border-gray-700 transition-all backdrop-blur-sm shadow-xl"
            >
              ⤢ Fullscreen
            </button>
          </div>

          <div className="flex justify-between items-start gap-8">
            <div className="flex-1">
              <h1 className="text-6xl font-black text-white mb-2 tracking-tighter">{game.name}</h1>
              <div className="text-xl font-medium text-yellow-500 flex items-center gap-3">
                <span>{game.year || '----'}</span>
                <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                <span className="text-gray-400 capitalize">{game.developer?.name || 'Unknown Developer'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Quick Actions & Metadata */}
        <div className="w-80 bg-gray-900/50 border-l border-gray-800 p-6 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            <PlayButton game={game} nav={nav} />

            <div
              onMouseEnter={() => nav.hoverZone('sid')}
              className={`rounded-lg transition-all ${nav.focusCls('sid')}`}
            >
              <SidPlayer filename={game.sidFilename} />
            </div>
          </div>

          {/* Quick Info */}
          <div className="space-y-4">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Game Data</div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-800 flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Genre</span>
                <span className="text-white font-medium">{game.parentGenre}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Sub-Genre</span>
                <span className="text-white font-medium">{game.subGenre}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Rating</span>
                <span className="text-yellow-500 font-bold">★★★★☆</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
