"use client";

import { useState, useEffect } from 'react';
import { Game, Extra } from '../../types/game';
import { useSettings } from '../../contexts/SettingsContext';
import { ImageSlider } from '../ImageSlider';
import { SidPlayer } from '../SidPlayer';
import { PlayButton } from './PlayButton';
import { DetailLayoutProps } from '../DetailView';
import { MusicianPhoto } from '../MusicianPhoto';
import { StatusRow } from '../StatusRow';
import { getGameExtras } from '../../lib/tauri-bridge';
import { ScrapeButton } from '../ScrapeButton';

export function DigitalMuseumLayout({ game, onBack, nav, onFullscreen }: DetailLayoutProps) {
  const { settings, resolveMediaPath } = useSettings();
  const [activeMedia, setActiveMedia] = useState<'gameplay' | 'titlescreen' | 'videosna' | 'boxfront' | 'extras'>('gameplay');
  const [extras, setExtras] = useState<Extra[]>([]);

  useEffect(() => {
    getGameExtras(game.id).then(setExtras);
  }, [game.id]);

  // Map media types to navigation zones
  const mediaToZone: Record<string, any> = {
    gameplay: 'media-gameplay',
    titlescreen: 'media-titlescreen',
    videosna: 'media-videosna',
    boxfront: 'media-boxfront',
    extras: 'media-extras',
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
    nav.registerAction('media-extras', () => setActiveMedia('extras'));
  }, [nav, activeMedia, game, onFullscreen]);

  const zoneLabels: Record<string, string> = {
    play: '▶ Play Game [A]',
    sid: '🎵 SID Music [A]',
    screenshot: '🔍 View Fullscreen [A]',
    'media-gameplay': '🖼️ Gameplay [A]',
    'media-titlescreen': '🖼️ Title [A]',
    'media-videosna': '🎥 Video [A]',
    'media-boxfront': '📦 Box Art [A]',
    'media-extras': '🎁 Extras [A]',
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

          {extras.length > 0 && (
            <button
              onClick={() => { setActiveMedia('extras'); nav.setFocusedZone('media-extras'); }}
              onMouseEnter={() => nav.hoverZone('media-extras')}
              className={`p-3 rounded-lg flex flex-col items-center gap-2 border transition-all ${
                activeMedia === 'extras'
                  ? 'bg-gray-800 border-yellow-500/50 text-white shadow-lg'
                  : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'
              } ${nav.focusCls('media-extras')}`}
            >
              <div className="text-sm font-semibold">Extras ({extras.length})</div>
            </button>
          )}
        </div>

        {/* Center: Main Stage */}
        <div className="flex-1 flex flex-col p-8 gap-8 overflow-y-auto custom-scrollbar bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.05),transparent_70%)]">
          
          {activeMedia !== 'extras' && (
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

            <button
              onClick={() => onFullscreen(activeMedia === 'videosna' ? game.screenshotFilename : (activeMedia === 'gameplay' ? game.screenshotFilename : activeMedia === 'titlescreen' ? game.titlescreenFilename : game.boxFrontFilename))}
              onMouseEnter={() => nav.hoverZone('screenshot')}
              className="absolute top-3 right-3 z-20 px-3 py-2 bg-black/60 hover:bg-black/80 text-white text-xs rounded border border-gray-700 transition-all backdrop-blur-sm shadow-xl"
            >
              ⤢ Fullscreen
            </button>
            
            <ScrapeButton 
              game={game} 
              className="absolute bottom-3 left-3 z-30" 
              onComplete={() => {
                 // Refresh logic here if needed
              }} 
            />
          </div>
        )}

          {activeMedia === 'extras' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {extras.map((extra) => {
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(extra.path);
                const fullPath = resolveMediaPath('extras', extra.path);
                
                return (
                  <div 
                    key={extra.id}
                    className="group/extra relative aspect-square bg-gray-900 rounded-xl border border-gray-800 overflow-hidden hover:border-yellow-500/50 transition-all shadow-lg"
                  >
                    {isImage ? (
                      <img 
                        src={fullPath} 
                        alt={extra.name}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => onFullscreen(extra.path)}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-3">
                         <div className="text-4xl">📄</div>
                         <a 
                           href={fullPath} 
                           target="_blank" 
                           rel="noreferrer"
                           className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase text-center break-all px-2"
                         >
                            Open Documentation
                         </a>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/80 backdrop-blur-sm border-t border-white/5">
                      <div className="text-[10px] font-bold text-white truncate">{extra.name}</div>
                      <div className="text-[8px] text-yellow-500/70 font-black uppercase tracking-widest">{extra.type}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-between items-start gap-8">
            <div className="flex-1">
              <h1 className="text-6xl font-black text-white mb-2 tracking-tighter">{game.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-yellow-500/80">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">{game.year || '----'}</span>
                  {game.publisher?.name && game.publisher.name !== '(Not Published)' && (
                    <>
                      <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                      <span className="text-white font-semibold">{game.publisher.name}</span>
                    </>
                  )}
                  {game.developer?.name && game.developer.name !== '(Unknown)' && (
                    <>
                      <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                      <span className="text-gray-400 capitalize">{game.developer.name}</span>
                    </>
                  )}
                </div>
                {(game.coderName && game.coderName !== '(Unknown)') || (game.graphicsName && game.graphicsName !== '(Unknown)') ? (
                  <div className="flex items-center gap-4 border-l border-gray-800 pl-4 h-11">
                    {game.coderName && game.coderName !== '(Unknown)' && (
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">Coding</span>
                        <span className="text-blue-400 text-xs truncate max-w-[150px]">{game.coderName}</span>
                      </div>
                    )}
                    {game.graphicsName && game.graphicsName !== '(Unknown)' && (
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">Graphics</span>
                        <span className="text-green-400 text-xs truncate max-w-[150px]">{game.graphicsName}</span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {game.musician && (
              <div className="flex items-center gap-4 bg-gray-900/80 p-4 rounded-2xl border border-gray-800 shadow-xl min-w-[300px]">
                <MusicianPhoto 
                  photoFilename={game.musician.photoPath} 
                  musicianName={game.musician.name} 
                  className="w-16 h-16 shrink-0"
                />
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Composer</div>
                  <div className="text-white font-bold text-lg leading-tight">{game.musician.name}</div>
                  {game.musician.nick && (
                    <div className="text-blue-400 text-xs font-mono">&quot;{game.musician.nick}&quot;</div>
                  )}
                  {game.musician.group && (
                    <div className="text-gray-500 text-[10px] mt-1 italic">{game.musician.group}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {game.comment && (
            <div className="bg-gray-900/40 p-6 rounded-xl border border-gray-800/50">
               <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Database Comments</div>
               <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{game.comment}</p>
            </div>
          )}
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
                <span className="text-yellow-500 font-bold">
                  {(() => {
                    const r = parseInt(game.reviewRating || "0");
                    if (r <= 0) return 'UNRATED';
                    const stars = Math.min(5, r);
                    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
                  })()}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Control</span>
                <span className="text-white font-medium">{game.control || 'Joystick'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Players</span>
                <span className="text-white font-medium">
                  {game.playersFrom === game.playersTo ? game.playersFrom : `${game.playersFrom}-${game.playersTo}`}
                  {game.playersSim === 'True' && ' (Simultaneous)'}
                </span>
              </div>
              {game.languages?.length > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Languages</span>
                  <span className="text-white font-medium">{game.languages.join(', ')}</span>
                </div>
              )}
            </div>

            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1 pt-4">Version Info</div>
            <div className="bg-gray-800/20 rounded-xl p-4 border border-gray-800 flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Version By</span>
                <span className="text-blue-400 font-medium">{game.versionBy || '---'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">PAL / NTSC</span>
                <span className="text-yellow-400 font-medium">{game.vPalNtsc || '---'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Trainers</span>
                <span className="text-white font-medium">{game.vTrainers || '0'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Size</span>
                <span className="text-white font-medium">{game.vLength ? `${game.vLength} Blocks` : '---'}</span>
              </div>
              <div className="h-px bg-gray-800 my-1" />
              <StatusRow label="Loading Screen" value={game.vLoadingScreen} />
              <StatusRow label="High Score Saver" value={game.vHighScoreSaver} />
              <StatusRow label="Included Docs" value={game.vIncludedDocs} />
              <StatusRow label="True Drive Emul" value={game.vTrueDriveEmu} />
            </div>

            {game.memo && (
              <div className="mt-4 p-3 bg-red-950/20 border border-red-500/20 rounded-lg text-[10px] text-red-200/60 font-mono">
                {game.memo}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
