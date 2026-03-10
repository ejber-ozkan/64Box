"use client";

import { useEffect } from 'react';
import { Game } from '../../types/game';
import { useSettings } from '../../contexts/SettingsContext';
import { ImageSlider } from '../ImageSlider';
import { SidPlayer } from '../SidPlayer';
import { PlayButton } from './PlayButton';
import { DetailLayoutProps } from '../DetailView';
import { MusicianPhoto } from '../MusicianPhoto';
import { StatusRow } from '../StatusRow';
import { getGameExtras } from '../../lib/tauri-bridge';
import { ScrapeButton } from '../ScrapeButton';
import { Extra } from '../../types/game';
import { useState } from 'react';

export function ConsoleHeroLayout({ game, onBack, nav, onFullscreen }: DetailLayoutProps) {
  const { resolveMediaPath } = useSettings();
  const [activeMedia, setActiveMedia] = useState<'gameplay' | 'titlescreen' | 'boxfront' | 'extras'>('gameplay');
  const [extras, setExtras] = useState<Extra[]>([]);

  useEffect(() => {
    getGameExtras(game.id).then(setExtras);
  }, [game.id]);

  const activeBg = game.videoSnapFilename 
    ? resolveMediaPath('screenshot', game.videoSnapFilename) 
    : (game.screenshotFilename ? resolveMediaPath('screenshot', game.screenshotFilename) : '');

  // Register theme actions
  useEffect(() => {
    nav.registerAction('play', () => document.getElementById('play-game-btn')?.click());
    nav.registerAction('play-web', () => document.getElementById('play-browser-btn')?.click());
    nav.registerAction('sid', () => document.getElementById('sid-play-btn')?.click());
    
    // Controller 'A' for fullscreen
    nav.registerAction('media-gameplay', () => { setActiveMedia('gameplay'); onFullscreen(game.screenshotFilename); });
    nav.registerAction('media-titlescreen', () => { setActiveMedia('titlescreen'); onFullscreen(game.titlescreenFilename); });
    nav.registerAction('media-boxfront', () => { setActiveMedia('boxfront'); onFullscreen(game.boxFrontFilename); });
    nav.registerAction('media-extras', () => setActiveMedia('extras'));
  }, [nav, onFullscreen, game]);

  const zoneLabels: Record<string, string> = {
    play: '▶ Play Desktop [A]',
    'play-web': '▶ Play Browser [A]',
    sid: '🎵 SID Music [A]',
    'media-gameplay': '🕹️ Gameplay [A]',
    'media-titlescreen': '🖼️ Title [A]',
    'media-boxfront': '📦 Box Art [A]',
    'media-extras': '🎁 Extras [A]',
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

        {/* Controller status bar */}
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

              {extras.length > 0 && (
                <div 
                  onClick={() => setActiveMedia('extras')}
                  onMouseEnter={() => nav.hoverZone('media-extras')}
                  className={`h-32 w-32 shrink-0 bg-white/5 rounded-xl border border-white/10 p-4 flex flex-col items-center justify-center gap-2 hover:ring-2 ring-blue-500 transition-all cursor-pointer ${nav.focusCls('media-extras')}`}
                >
                   <div className="text-3xl">🎁</div>
                   <div className="text-[10px] font-bold uppercase text-white/70">Extras ({extras.length})</div>
                </div>
              )}
           </div>
        </div>

        {/* Right Side: Frosted Glass Metadata Panel */}
        <div className="w-[400px] flex flex-col shrink-0 gap-6">
           {activeMedia === 'extras' ? (
             <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                  <span className="text-blue-400">🎁</span> Game Extras
                </h2>
                <div className="space-y-4">
                  {extras.map(extra => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(extra.path);
                    const fullPath = resolveMediaPath('extras', extra.path);
                    return (
                      <div key={extra.id} className="bg-white/5 rounded-2xl p-3 border border-white/10 group/item hover:bg-white/10 transition-all">
                        {isImage ? (
                          <div className="mb-2 rounded-xl overflow-hidden aspect-video bg-black cursor-pointer" onClick={() => onFullscreen(extra.path)}>
                            <img src={fullPath} alt={extra.name} className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-500" />
                          </div>
                        ) : (
                          <div className="mb-2 rounded-xl p-4 bg-black/40 flex items-center justify-center text-3xl">📄</div>
                        )}
                        <div className="px-1">
                          <div className="text-sm font-bold text-white truncate">{extra.name}</div>
                          <div className="flex justify-between items-center mt-1">
                             <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{extra.type}</span>
                             {!isImage && (
                               <a href={fullPath} target="_blank" rel="noreferrer" className="text-[10px] text-white/50 hover:text-white underline font-medium">Open Dir</a>
                             )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button 
                  onClick={() => setActiveMedia('gameplay')}
                  className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold text-xs uppercase tracking-widest transition-all"
                >
                  Close Extras
                </button>
             </div>
           ) : (
             <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl flex-1 flex flex-col transform transition translate-y-4 group-hover:translate-y-0 duration-700">
              <h1 className="text-5xl font-black text-white mb-2 leading-tight">{game.name}</h1>
              <div className="text-blue-400 font-semibold text-lg mb-8 uppercase tracking-wide">
                {[
                  game.year,
                  game.publisher?.name && game.publisher.name !== '(Not Published)' ? game.publisher.name : null,
                  game.developer?.name && game.developer.name !== '(Unknown)' ? game.developer.name : null
                ].filter(Boolean).join(' • ')}
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-gray-400">Genre</span>
                  <span className="text-white font-medium">{game.parentGenre} / {game.subGenre}</span>
                </div>

                {game.publisher?.name && game.publisher.name !== '(Not Published)' && (
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className="text-gray-400">Publisher</span>
                    <span className="text-white font-medium">{game.publisher.name}</span>
                  </div>
                )}

                {game.musician?.name && (
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className="text-gray-400">Musician</span>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-white font-medium">{game.musician.name}</div>
                        {game.musician.nick && <div className="text-blue-400 text-[10px] font-mono">&quot;{game.musician.nick}&quot;</div>}
                      </div>
                      <MusicianPhoto 
                        photoFilename={game.musician.photoPath} 
                        musicianName={game.musician.name} 
                        className="w-10 h-10 shadow-lg border border-white/10"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-gray-400">Control</span>
                  <span className="text-white font-medium">{game.control || 'Joystick'}</span>
                </div>

                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-gray-400">Players</span>
                  <span className="text-white font-medium">
                    {game.playersFrom === game.playersTo ? game.playersFrom : `${game.playersFrom}-${game.playersTo}`}
                    {game.playersSim === 'True' && ' (Sim)'}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-gray-400">Rating</span>
                  <span className="text-yellow-500 font-bold">
                    {(() => {
                      const r = parseInt(game.reviewRating || "0");
                      if (r <= 0) return 'NR';
                      const stars = Math.min(5, r);
                      return '★'.repeat(stars) + '☆'.repeat(5 - stars);
                    })()}
                  </span>
                </div>

                {(game.coderName && game.coderName !== '(Unknown)') || (game.graphicsName && game.graphicsName !== '(Unknown)') ? (
                  <div className="grid grid-cols-2 gap-4 border-b border-white/10 pb-4">
                    {game.coderName && game.coderName !== '(Unknown)' && (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Coder</span>
                        <span className="text-blue-300 text-sm truncate">{game.coderName}</span>
                      </div>
                    )}
                    {game.graphicsName && game.graphicsName !== '(Unknown)' && (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Artist</span>
                        <span className="text-green-300 text-sm truncate">{game.graphicsName}</span>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="bg-white/5 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Version Details</div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Version By</span>
                    <span className="text-blue-300 font-medium">{game.versionBy || '---'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">PAL / NTSC</span>
                    <span className="text-yellow-400 font-medium">{game.vPalNtsc || '---'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Trainers</span>
                    <span className="text-white font-medium">{game.vTrainers || '0'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Size</span>
                    <span className="text-white font-medium">{game.vLength ? `${game.vLength} Blocks` : '---'}</span>
                  </div>
                  
                  <div className="h-px bg-white/10 my-1" />
                  
                  <div className="space-y-2">
                    <StatusRow label="Loading Screen" value={game.vLoadingScreen} />
                    <StatusRow label="High Score Saver" value={game.vHighScoreSaver} />
                    <StatusRow label="Included Docs" value={game.vIncludedDocs} />
                    <StatusRow label="True Drive Emul" value={game.vTrueDriveEmu} />
                  </div>
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-4">
                 <ScrapeButton game={game} />
                 <PlayButton game={game} nav={nav} />
                 <div 
                    onMouseEnter={() => nav.hoverZone('sid')}
                    className={`rounded-xl transition-all ${nav.focusCls('sid')}`}
                 >
                    <SidPlayer filename={game.sidFilename} />
                 </div>
              </div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
