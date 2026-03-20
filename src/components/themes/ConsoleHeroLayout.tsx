"use client";

import { useEffect, useMemo, useCallback } from 'react';
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
import { ExtrasDetail } from '../ExtrasDetail';
import { useState } from 'react';
import { DetailGameTitle } from '../detail/DetailGameTitle';

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

  const availableMedia = useMemo(() => {
    const items: Array<{ id: 'gameplay' | 'titlescreen' | 'boxfront' | 'extras'; zone: 'media-gameplay' | 'media-titlescreen' | 'media-boxfront' | 'media-extras' }> = [
      { id: 'gameplay', zone: 'media-gameplay' },
    ];
    if (extras.length > 0) items.push({ id: 'extras', zone: 'media-extras' });
    if (game.titlescreenFilename) items.push({ id: 'titlescreen', zone: 'media-titlescreen' });
    if (game.boxFrontFilename || game.coverPath) items.push({ id: 'boxfront', zone: 'media-boxfront' });
    return items;
  }, [extras.length, game.boxFrontFilename, game.coverPath, game.titlescreenFilename]);

  const cycleMedia = useCallback((direction: 'previous' | 'next') => {
    const currentIndex = Math.max(availableMedia.findIndex((item) => item.id === activeMedia), 0);
    const delta = direction === 'next' ? 1 : -1;
    const nextIndex = (currentIndex + delta + availableMedia.length) % availableMedia.length;
    const nextMedia = availableMedia[nextIndex];
    setActiveMedia(nextMedia.id);
    nav.setFocusedZone(nextMedia.zone);
  }, [activeMedia, availableMedia, nav]);

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
    nav.registerTabActions({
      previous: () => cycleMedia('previous'),
      next: () => cycleMedia('next'),
    });
  }, [cycleMedia, nav, onFullscreen, game]);

  const zoneLabels: Record<string, string> = {
    play: '▶ Launch Emulator [A]',
    'play-web': '▶ Play Embedded [A]',
    favorite: '♥ Favorite [A]',
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

      <div className="relative z-10 flex flex-1 overflow-hidden px-12 xl:px-16 2xl:px-24 pb-12 gap-12 xl:gap-16 max-w-[2000px] mx-auto w-full transition-all">
        {/* Left Side: Massive Gameplay/Video Stage */}
        <div className="flex-1 flex flex-col justify-end">
           {/* Primary Video / Image */}
           <div 
             onClick={() => onFullscreen(game.screenshotFilename)}
             onMouseEnter={() => nav.hoverZone('media-gameplay')}
             className={`aspect-[4/3] w-full max-w-[1200px] mx-auto max-h-[65vh] rounded-3xl overflow-hidden shadow-[0_35px_60px_-15px_rgba(0,0,0,0.8)] border border-white/10 mb-10 bg-black transition-all cursor-pointer group/media ${nav.focusCls('media-gameplay')}`}
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

           <div className="mx-auto mb-8 w-full max-w-[1200px] flex flex-col gap-4 lg:flex-row lg:items-start">
             <div className="w-full max-w-[360px]">
               <PlayButton game={game} nav={nav} />
             </div>
             <div className="w-full max-w-[220px]">
               <ScrapeButton game={game} />
             </div>
           </div>

           {/* Carousel Strip */}
           <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
              {/* Gameplay (Main focus) implicitly handled by activeMedia state, but let's represent the others */}
              
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
        <div className="w-[400px] xl:w-[480px] 2xl:w-[560px] flex flex-col shrink-0 gap-8 transition-all">
           {activeMedia === 'extras' ? (
             <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                  <span className="text-blue-400">🎁</span> Game Extras
                </h2>
                <ExtrasDetail game={game} extras={extras} enableBigscreenGalleryUX />
                <button 
                  onClick={() => setActiveMedia('gameplay')}
                  className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold text-xs uppercase tracking-widest transition-all"
                >
                  Close Extras
                </button>
             </div>
           ) : (
             <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 2xl:p-12 shadow-2xl flex-1 flex flex-col transform transition translate-y-4 group-hover:translate-y-0 duration-700">
              <DetailGameTitle
                className="mb-3 flex flex-wrap items-center gap-4 text-5xl font-black leading-none tracking-tighter text-white xl:text-6xl 2xl:text-7xl"
                isClassic={game.isClassic}
                title={game.name}
              />
              <div className="text-blue-400 font-semibold text-lg xl:text-xl mb-10 uppercase tracking-widest opacity-90">
                {[
                  game.year,
                  game.publisher?.name && game.publisher.name !== '(Not Published)' ? game.publisher.name : null,
                  game.developer?.name && game.developer.name !== '(Unknown)' ? game.developer.name : null
                ].filter(Boolean).join(' • ')}
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center border-b border-white/10 pb-5 text-sm xl:text-base">
                  <span className="text-gray-400">Genre</span>
                  <span className="text-white font-medium">{game.parentGenre} / {game.subGenre}</span>
                </div>

                {game.publisher?.name && game.publisher.name !== '(Not Published)' && (
                  <div className="flex justify-between items-center border-b border-white/10 pb-5 text-sm xl:text-base">
                    <span className="text-gray-400">Publisher</span>
                    <span className="text-white font-medium">{game.publisher.name}</span>
                  </div>
                )}

                {game.musician?.name && (
                  <div className="flex justify-between items-center border-b border-white/10 pb-5 text-sm xl:text-base">
                    <span className="text-gray-400">Musician</span>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-white font-medium">{game.musician.name}</div>
                        {game.musician.nick && <div className="text-blue-400 text-[11px] font-mono tracking-tighter">&quot;{game.musician.nick}&quot;</div>}
                      </div>
                      <MusicianPhoto 
                        photoFilename={game.musician.photoPath} 
                        musicianName={game.musician.name} 
                        className="w-12 h-12 shadow-lg border border-white/10"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center border-b border-white/10 pb-5 text-sm xl:text-base">
                  <span className="text-gray-400">Control</span>
                  <span className="text-white font-medium">{game.control || 'Joystick'}</span>
                </div>

                <div className="flex justify-between items-center border-b border-white/10 pb-5 text-sm xl:text-base">
                  <span className="text-gray-400">Players</span>
                  <span className="text-white font-medium">
                    {game.playersFrom === game.playersTo ? game.playersFrom : `${game.playersFrom}-${game.playersTo}`}
                    {game.playersSim === 'True' && ' (Sim)'}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-white/10 pb-5 text-sm xl:text-base">
                  <span className="text-gray-400">Rating</span>
                  <span className="text-yellow-500 font-black tracking-widest">
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

                <div className="bg-white/5 rounded-3xl p-6 xl:p-8 flex flex-col gap-4">
                  <div className="text-[11px] 2xl:text-xs text-gray-400 uppercase tracking-widest font-black mb-1">Version Details</div>
                  <div className="flex justify-between text-xs xl:text-sm">
                    <span className="text-gray-400">Version By</span>
                    <span className="text-blue-300 font-medium">{game.versionBy || '---'}</span>
                  </div>
                  <div className="flex justify-between text-xs xl:text-sm">
                    <span className="text-gray-400">PAL / NTSC</span>
                    <span className="text-yellow-400 font-medium">{game.vPalNtsc || '---'}</span>
                  </div>
                  <div className="flex justify-between text-xs xl:text-sm">
                    <span className="text-gray-400">Trainers</span>
                    <span className="text-white font-medium">{game.vTrainers || '0'}</span>
                  </div>
                  <div className="flex justify-between text-xs xl:text-sm">
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
