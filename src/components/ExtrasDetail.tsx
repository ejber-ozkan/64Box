"use client";

import React, { useState, useEffect } from 'react';
import { Game, Extra } from '../types/game';
import { groupExtras, ExtraGroup } from '../lib/extras';
import { useSettings } from '../contexts/SettingsContext';
import { getAssetUrl, openFile, launchEmulator } from '../lib/tauri-bridge';
import { ImageWithFallback } from './ImageWithFallback';

interface ExtrasDetailProps {
  game: Game;
  extras: Extra[];
  visibleCategories?: ExtraGroup['category'][];
  hideEmptyState?: boolean;
}

export function ExtrasDetail({ game, extras, visibleCategories, hideEmptyState = false }: ExtrasDetailProps) {
  const { settings } = useSettings();
  const [groupedExtras, setGroupedExtras] = useState<ExtraGroup[]>([]);
  const [launchStatus, setLaunchStatus] = useState<string | null>(null);

  useEffect(() => {
    setGroupedExtras(groupExtras(extras));
  }, [extras]);

  const visibleGroups = visibleCategories
    ? groupedExtras.filter((group) => visibleCategories.includes(group.category))
    : groupedExtras;

  if (extras.length === 0 || visibleGroups.length === 0) {
    if (hideEmptyState) return null;
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 opacity-50">
        <span className="text-4xl mb-4">🗂️</span>
        <p className="text-sm font-medium">No additional extras available for this title.</p>
      </div>
    );
  }

  const handleLaunchExtra = async (extra: Extra) => {
    const isRetroarch = settings.preferredEmulator === 'retroarch';
    const emulatorPath = isRetroarch ? settings.retroarchPath : settings.emulatorPath;

    if (!emulatorPath) {
      setLaunchStatus("Error: Emulator path not configured in Settings.");
      return;
    }

    setLaunchStatus(`Launching ${extra.name}...`);
    try {
      // Path construction: normalize all slashes to forward slashes for internal logic
      const cleanExtrasPath = (settings.extrasPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
      const cleanExtraPath = extra.path.replace(/\\/g, '/').replace(/^\/+/, '');
      const fullRomPath = [cleanExtrasPath, cleanExtraPath].join('/');
      
      const result = await launchEmulator({
        emulator_path: emulatorPath,
        rom_path: fullRomPath,
        true_drive_emulation: game.trueDriveEmu ?? false,
        is_pal: game.isPal ?? true,
        game_id: game.id.toString(),
        core_path: isRetroarch ? settings.retroarchCorePath : undefined,
      });

      if (!result.success) {
        setLaunchStatus(`Error: ${result.message}`);
      } else {
          setLaunchStatus(null);
      }
    } catch (err) {
      setLaunchStatus(`Error: ${String(err)}`);
    }
    setTimeout(() => setLaunchStatus(null), 5000);
  };

  const handleOpenDoc = async (extra: Extra) => {
    const cleanExtrasPath = (settings.extrasPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
    const cleanExtraPath = extra.path.replace(/\\/g, '/').replace(/^\/+/, '');
    const fullPath = [cleanExtrasPath, cleanExtraPath].join('/');
    await openFile(fullPath);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {launchStatus && (
        <div className="fixed bottom-8 right-8 z-[110] bg-blue-900/90 border border-blue-500 text-white px-6 py-3 rounded-full shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300">
          {launchStatus}
        </div>
      )}

      {visibleGroups.map(group => (
        <div key={group.category} className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-white font-bold text-xs uppercase tracking-[0.2em] opacity-80">{group.label}</h3>
            <div className="h-px flex-1 bg-gradient-to-r from-gray-700/50 to-transparent"></div>
          </div>

          {group.category === 'visual' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {group.items.map(item => (
                <VisualExtraCard key={item.id} extra={item} extrasPath={settings.extrasPath} />
              ))}
            </div>
          )}

          {group.category === 'docs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleOpenDoc(item)}
                  className="flex items-center gap-4 p-4 bg-gray-900/40 border border-gray-800 rounded-xl hover:bg-gray-800/60 hover:border-gray-600 transition-all text-left group"
                >
                  <div className="w-10 h-10 flex-shrink-0 bg-red-950/30 border border-red-500/20 rounded-lg flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                    {item.path.toLowerCase().endsWith('.pdf') ? '📄' : '📝'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">{item.name}</div>
                    <div className="text-gray-500 text-[10px] uppercase tracking-wider truncate">{item.path.split(/[\/\\]/).shift()}</div>
                  </div>
                  <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">Open ↗</span>
                </button>
              ))}
            </div>
          )}

          {group.category === 'games' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleLaunchExtra(item)}
                  className="flex items-center gap-4 p-4 bg-blue-950/20 border border-blue-900/30 rounded-xl hover:bg-blue-900/40 hover:border-blue-500/50 transition-all text-left group"
                >
                  <div className="w-10 h-10 flex-shrink-0 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                    🕹️
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">{item.name}</div>
                    <div className="text-blue-400/60 text-[10px] uppercase tracking-wider truncate">Load from {item.path.split(/[\/\\]/).shift()}</div>
                  </div>
                  <span className="text-green-400 font-bold text-[10px] tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">Launch</span>
                </button>
              ))}
            </div>
          )}

          {group.category === 'media' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleOpenDoc(item)}
                  className="flex items-center gap-4 p-4 bg-purple-950/20 border border-purple-900/30 rounded-xl hover:bg-purple-900/40 hover:border-purple-500/50 transition-all text-left group"
                >
                  <div className="w-10 h-10 flex-shrink-0 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                    {item.path.toLowerCase().endsWith('.mp3') ? '🎵' : '🎬'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">{item.name}</div>
                    <div className="text-purple-400/60 text-[10px] uppercase tracking-wider truncate">Asset file</div>
                  </div>
                   <span className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">Play ↗</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function VisualExtraCard({ extra, extrasPath }: { extra: Extra; extrasPath: string }) {
  const [url, setUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const cleanExtrasPath = (extrasPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
    const cleanExtraPath = extra.path.replace(/\\/g, '/').replace(/^\/+/, '');
    const fullPath = [cleanExtrasPath, cleanExtraPath].join('/');
    getAssetUrl(fullPath).then(setUrl);
  }, [extra.path, extrasPath]);

  return (
    <>
      <div 
        className="group relative aspect-[3/4] bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-blue-500/50 transition-all cursor-zoom-in shadow-lg"
        onClick={() => setIsFullscreen(true)}
      >
        <ImageWithFallback
          src={url}
          alt={extra.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
          <p className="text-white font-bold text-xs truncate">{extra.name}</p>
          <p className="text-gray-400 text-[9px] uppercase tracking-widest">{extra.path.split(/[\/\\]/).shift()}</p>
        </div>
      </div>

      {isFullscreen && (
        <div 
          className="fixed inset-0 z-[120] bg-black/98 p-8 flex items-center justify-center backdrop-blur-xl animate-in fade-in zoom-in duration-300 pointer-events-auto"
          onClick={() => setIsFullscreen(false)}
        >
          <div className="relative max-w-5xl w-full max-h-full flex flex-col items-center gap-4">
             <ImageWithFallback
                src={url}
                alt={extra.name}
                fit="contain"
                className="max-w-full max-h-[85vh] shadow-2xl rounded-lg"
             />
             <div className="text-center">
                <h2 className="text-white font-bold text-xl">{extra.name}</h2>
                <p className="text-gray-400 text-sm uppercase tracking-widest">{extra.path}</p>
             </div>
             <button 
               className="absolute top-0 right-0 p-4 text-white hover:text-red-400 text-4xl leading-none"
               onClick={() => setIsFullscreen(false)}
             >
               ×
             </button>
          </div>
        </div>
      )}
    </>
  );
}
