"use client";

import { useState } from 'react';
import { launchEmulator } from '../../lib/tauri-bridge';
import { useSettings } from '../../contexts/SettingsContext';
import { Game } from '../../types/game';
import { WasmPlayer } from '../WasmPlayer';

interface PlayButtonProps {
  game: Game;
  nav?: any;
}

export function PlayButton({ game, nav }: PlayButtonProps) {
  const { settings } = useSettings();
  const [status, setStatus] = useState<'idle' | 'launching' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showWasm, setShowWasm] = useState(false);

  const romPath = `${settings.romsPath}/${game.gameFilename}`;

  const handlePlayNative = async () => {
    const isRetroarch = settings.preferredEmulator === 'retroarch';
    const emulatorPath = isRetroarch ? settings.retroarchPath : settings.emulatorPath;

    if (!emulatorPath) {
      setStatus('error');
      setMessage(`No emulator configured. Set your ${isRetroarch ? 'RetroArch' : 'VICE'} path in Settings.`);
      setTimeout(() => setStatus('idle'), 4000);
      return;
    }

    if (isRetroarch && !settings.retroarchCorePath) {
      setStatus('error');
      setMessage('RetroArch requires a Core (DLL/SO). Please select one in Settings → Local Paths.');
      setTimeout(() => setStatus('idle'), 6000);
      return;
    }

    if (!game.gameFilename) {
      setStatus('error');
      setMessage('No ROM file linked to this game.');
      setTimeout(() => setStatus('idle'), 4000);
      return;
    }

    setStatus('launching');
    try {
      const result = await launchEmulator({
        emulator_path: emulatorPath,
        rom_path: romPath,
        true_drive_emulation: game.trueDriveEmu ?? false,
        is_pal: game.isPal ?? true,
        game_id: game.id.toString(),
        core_path: isRetroarch ? settings.retroarchCorePath : undefined,
      });

      if (result.success) {
        setStatus('success');
        setMessage(result.message);
      } else {
        setStatus('error');
        setMessage(result.message);
      }
    } catch (err) {
      setStatus('error');
      setMessage(String(err));
    }
    setTimeout(() => setStatus('idle'), 4000);
  };

  const buttonStyles: Record<typeof status, string> = {
    idle:      'bg-gradient-to-b from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 text-white shadow-lg shadow-green-900/30 border border-green-500/50',
    launching: 'bg-gray-700 text-gray-400 cursor-not-allowed border border-gray-600/50',
    success:   'bg-green-800 text-green-200 border border-green-700/50',
    error:     'bg-red-900 text-red-200 border border-red-800/50',
  };

  const buttonLabel: Record<typeof status, string> = {
    idle:      '▶ Desktop',
    launching: '⏳...  ',
    success:   '✓ Ok ',
    error:     '✗ Err',
  };

  const handlePlayWeb = () => {
    if (!game.gameFilename) {
      setStatus('error');
      setMessage('No ROM file linked to this game.');
      setTimeout(() => setStatus('idle'), 4000);
      return;
    }
    setShowWasm(true);
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex flex-row gap-2 w-full">
          <div
            onMouseEnter={() => nav && nav.hoverZone('play')}
            className={`flex-1 rounded-lg transition-all ${nav ? nav.focusCls('play') : ''}`}
          >
            <button
              id="play-game-btn"
              onClick={handlePlayNative}
              disabled={status === 'launching'}
              className={`w-full h-full py-3 px-2 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wider transition-all ${buttonStyles[status]}`}
            >
              {buttonLabel[status]}
            </button>
          </div>
          <div
            onMouseEnter={() => nav && nav.hoverZone('play-web')}
            className={`flex-1 rounded-lg transition-all ${nav ? nav.focusCls('play-web') : ''}`}
          >
            <button
              id="play-browser-btn"
              onClick={handlePlayWeb}
              className="w-full h-full py-3 px-2 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wider transition-all bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 border border-blue-600/30"
            >
              ▶ Browser
            </button>
          </div>
        </div>

        {message && (
          <p className={`text-[10px] leading-snug text-center ${status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}
        {!(settings.preferredEmulator === 'retroarch' ? settings.retroarchPath : settings.emulatorPath) && status === 'idle' && (
          <p className="text-[10px] text-yellow-600 text-center">
            ⚠ Desktop emulator not set
          </p>
        )}
      </div>

      {showWasm && (
        <WasmPlayer 
          romPath={romPath} 
          onClose={() => setShowWasm(false)} 
        />
      )}
    </>
  );
}
