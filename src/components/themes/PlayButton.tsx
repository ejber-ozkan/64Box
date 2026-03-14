"use client";

import { useState } from 'react';
import { launchEmulator } from '../../lib/tauri-bridge';
import { useSettings } from '../../contexts/SettingsContext';
import { Game } from '../../types/game';
import { WasmPlayer } from '../WasmPlayer';
import { DetailNavigationHook } from '../../hooks/useDetailNavigation';

interface PlayButtonProps {
  game: Game;
  nav?: DetailNavigationHook;
}

export function PlayButton({ game, nav }: PlayButtonProps) {
  const { settings } = useSettings();
  const [status, setStatus] = useState<'idle' | 'launching' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showWasm, setShowWasm] = useState(false);

  const romRelativePath = game.filename || game.gameFilename || '';
  const romPath = [settings.romsPath, romRelativePath]
    .map((segment) => segment.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');

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

    if (!romRelativePath) {
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
    idle:      'bg-[linear-gradient(180deg,#2dd4bf,#0f766e)] hover:from-teal-300 hover:to-teal-600 text-white shadow-lg shadow-teal-950/40 border border-teal-300/40',
    launching: 'bg-gray-700 text-gray-400 cursor-not-allowed border border-gray-600/50',
    success:   'bg-green-800 text-green-200 border border-green-700/50',
    error:     'bg-red-900 text-red-200 border border-red-800/50',
  };

  const buttonLabel: Record<typeof status, string> = {
    idle:      'Launch Emulator',
    launching: 'Launching',
    success:   'Launched',
    error:     'Launch Failed',
  };

  const handlePlayWeb = () => {
    if (!romRelativePath) {
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
        <div className="grid grid-cols-1 gap-3 w-full">
          <div
            onMouseEnter={() => nav && nav.hoverZone('play')}
            className={`flex-1 rounded-lg transition-all ${nav ? nav.focusCls('play') : ''}`}
          >
            <button
              id="play-game-btn"
              onClick={handlePlayNative}
              disabled={status === 'launching'}
              className={`grid min-h-[104px] w-full grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl px-5 py-4 text-left font-bold transition-all ${buttonStyles[status]}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/20 text-xl">▶</span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[12px] uppercase tracking-[0.14em] leading-tight sm:whitespace-nowrap">{buttonLabel[status]}</span>
                  <span className="text-[11px] font-medium normal-case tracking-normal text-white/80">
                    Native desktop emulator
                  </span>
              </span>
              <span className="shrink-0 text-right text-[10px] uppercase tracking-[0.16em] text-white/70 xl:text-xs">
                {settings.preferredEmulator === 'retroarch' ? 'RetroArch' : 'VICE'}
              </span>
            </button>
          </div>
          <div
            onMouseEnter={() => nav && nav.hoverZone('play-web')}
            className={`flex-1 rounded-lg transition-all ${nav ? nav.focusCls('play-web') : ''}`}
          >
            <button
              id="play-browser-btn"
              onClick={handlePlayWeb}
              className="grid min-h-[104px] w-full grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-sky-400/30 bg-sky-500/15 px-5 py-4 text-left font-bold text-sky-100 transition-all hover:bg-sky-500/25"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/20 text-xl">▸</span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[12px] uppercase tracking-[0.14em] leading-tight sm:whitespace-nowrap">Play Embedded</span>
                  <span className="text-[11px] font-medium normal-case tracking-normal text-sky-100/80">
                    In-app emulator
                  </span>
              </span>
              <span className="shrink-0 text-right text-[10px] uppercase tracking-[0.16em] text-sky-100/70 xl:text-xs">Instant</span>
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
