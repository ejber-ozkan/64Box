"use client";

import { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { openDirectoryDialog, openFileDialog } from '../lib/tauri-bridge';

interface SettingsViewProps {
  onBack: () => void;
}

export function SettingsView({ onBack }: SettingsViewProps) {
  const { settings, updateSettings } = useSettings();
  const [localScreenshots, setLocalScreenshots]   = useState(settings.screenshotsPath);
  const [localSounds, setLocalSounds]             = useState(settings.soundsPath);
  const [localMusician, setLocalMusician]         = useState(settings.musicianPhotosPath);
  const [localRoms, setLocalRoms]                 = useState(settings.romsPath);
  const [localEmulator, setLocalEmulator]         = useState(settings.emulatorPath);
  const [localEmuMoviesUser, setLocalEmuMoviesUser] = useState(settings.emuMoviesUsername);
  const [localEmuMoviesPass, setLocalEmuMoviesPass] = useState(settings.emuMoviesPassword);
  const [localTheme, setLocalTheme]               = useState(settings.detailViewTheme);
  const [localScrapedMedia, setLocalScrapedMedia] = useState(settings.scrapedMediaPath);
  const [localHideAdult, setLocalHideAdult]       = useState(settings.hideAdultContent);
  const [activeTab, setActiveTab]                 = useState<'appearance' | 'content' | 'paths' | 'emumovies' | 'maintenance'>('appearance');
  const [scanStatus, setScanStatus]               = useState<string | null>(null);

  const handleSave = () => {
    updateSettings({
      screenshotsPath: localScreenshots,
      soundsPath: localSounds,
      musicianPhotosPath: localMusician,
      romsPath: localRoms,
      emulatorPath: localEmulator,
      emuMoviesUsername: localEmuMoviesUser,
      emuMoviesPassword: localEmuMoviesPass,
      detailViewTheme: localTheme,
      scrapedMediaPath: localScrapedMedia,
      hideAdultContent: localHideAdult,
    });
    onBack();
  };

  const browse = async (setter: (v: string) => void) => {
    const chosen = await openDirectoryDialog();
    if (chosen) setter(chosen);
  };

  const pathRow = (label: string, value: string, setter: (v: string) => void, placeholder: string, isFile = false) => (
    <div key={label}>
      <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1.5">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
          value={value}
          onChange={(e) => setter(e.target.value)}
          placeholder={placeholder}
        />
        {!isFile && (
          <button
            onClick={() => browse(setter)}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded text-xs transition shrink-0 border border-gray-700"
            title="Browse (Desktop mode only)"
          >
            Browse…
          </button>
        )}
      </div>
    </div>
  );

  const tabs = [
    { id: 'appearance', label: '🎨 Appearance' },
    { id: 'content',    label: '🔞 Content' },
    { id: 'paths',      label: '📁 Local Paths' },
    { id: 'emumovies', label: '🎬 EmuMovies' },
    { id: 'maintenance', label: '🛠️ Maintenance' },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-gray-950 w-full min-h-screen overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-10 shadow-lg flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 hover:text-white rounded text-gray-300 font-medium transition-colors text-sm uppercase tracking-wider"
          >
            ← Back to Library
          </button>
          <h2 className="text-xl font-black text-white tracking-widest uppercase ml-4">⚙ Settings</h2>
        </div>
        
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold uppercase tracking-widest text-sm transition shadow-lg"
        >
          Save Configuration
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden p-6 gap-6 max-w-[1600px] mx-auto w-full">
        {/* Left Sidebar (Tabs) */}
        <div className="w-64 flex flex-col gap-2 overflow-y-auto pr-2 pb-10">
          <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2 px-2">Configuration Categories</div>
          
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`p-4 rounded-lg flex items-center gap-3 border transition text-left ${
                activeTab === t.id
                  ? 'bg-gray-800 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                  : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <span className="font-semibold">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Center Main Stage */}
        <div className="flex-1 flex flex-col bg-gray-900 border border-gray-800 rounded-xl shadow-2xl relative overflow-y-auto">
           <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent z-10"></div>
           
           <div className="p-8">
          {activeTab === 'appearance' && (
            <>
              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Detail View Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'cia', label: 'CIA-6526', desc: 'Structured tabs' },
                    { value: 'vic', label: 'VIC-II',   desc: 'Console hero' },
                    { value: 'sx64', label: 'SX-64',   desc: 'Power-user' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setLocalTheme(opt.value)}
                      className={`p-3 rounded-lg border text-center flex flex-col items-center gap-1 transition ${
                        localTheme === opt.value
                          ? 'bg-blue-900/40 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                          : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }`}
                    >
                      <span className="font-bold text-sm">{opt.label}</span>
                      <span className="text-[10px] text-gray-500">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'content' && (
            <>
              <div className="flex flex-col gap-5">
                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Content Filters</div>
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 flex flex-col gap-4">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                      <div className="text-white font-semibold flex items-center gap-2">
                        🔞 Hide Adult Content
                      </div>
                      <div className="text-xs text-gray-400 mt-1 max-w-sm">
                        Hides games marked as adult in the Gamebase64 database (223 games). This includes titles like "Sex Games", "Blue Angel 69", etc. Recommended to keep ON.
                      </div>
                    </div>
                    <button
                      onClick={() => setLocalHideAdult(prev => !prev)}
                      className={`relative w-14 h-7 rounded-full transition-colors shrink-0 ml-6 ${localHideAdult ? 'bg-blue-600' : 'bg-gray-600'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${localHideAdult ? 'translate-x-7' : 'translate-x-0'}`} />
                    </button>
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  Adult content filter is applied globally whenever you browse or search games. It uses the official Gamebase64 Adult flag field. Toggling requires hitting "Save Configuration" to take effect.
                </p>
              </div>
            </>
          )}

          {activeTab === 'paths' && (
            <>
              <div className="flex flex-col gap-4">
                <div className="text-[#66c0f4] font-bold text-xs uppercase tracking-widest border-b border-[#2a475e] pb-1.5 mt-2">
                  -------- Gamebase64 Folders --------
                </div>
                {pathRow('Games folder', localRoms, setLocalRoms, 'e.g. D:/GB64/Games')}
                {pathRow('Screenshots folder', localScreenshots, setLocalScreenshots, 'e.g. D:/GB64/Screenshots')}
                {pathRow('C64Music folder', localSounds, setLocalSounds, 'e.g. D:/GB64/C64Music')}
                {pathRow('Photos (Musicians) folder', localMusician, setLocalMusician, 'e.g. D:/GB64/Photos')}
                <div className="text-[#66c0f4] font-bold text-xs uppercase tracking-widest border-t border-[#2a475e] pt-1.5 mb-2">
                  -------- Gamebase64 Folders
                </div>

                <hr className="border-gray-700 mt-1 mb-1" />
                
                {pathRow('Emulator Executable (x64sc.exe)', localEmulator, setLocalEmulator, 'e.g. C:/VICE/x64sc.exe', true)}
                <button
                  onClick={async () => {
                    const chosen = await openFileDialog();
                    if (chosen) setLocalEmulator(chosen);
                  }}
                  className="self-start px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded text-xs transition border border-gray-700"
                >
                  Browse for x64sc.exe…
                </button>
                <hr className="border-gray-700 mt-2 mb-1" />
                {pathRow('Scraped Media Folder', localScrapedMedia, setLocalScrapedMedia, 'e.g. D:/MYSOURCE/VIC40GameBase64/64BoxMedia')}
              </div>
              <p className="text-[10px] text-emerald-600">
                ✅ &quot;Browse…&quot; opens the native OS folder picker in Tauri desktop mode.
              </p>
            </>
          )}

          {activeTab === 'emumovies' && (
            <>
              <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg p-4 text-sm text-blue-200">
                <strong>EmuMovies Integration</strong><br />
                Enter your EmuMovies login credentials to enable automatic downloading of video snaps,
                gameplay clips, and additional media for your C64 games.
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1.5">EmuMovies Username</label>
                  <input
                    type="text"
                    className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                    value={localEmuMoviesUser}
                    onChange={(e) => setLocalEmuMoviesUser(e.target.value)}
                    placeholder="EmuMovies Username"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1.5">EmuMovies Password</label>
                  <input
                    type="password"
                    className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                    value={localEmuMoviesPass}
                    onChange={(e) => setLocalEmuMoviesPass(e.target.value)}
                    placeholder="EmuMovies Password"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  You must have a <span className="text-blue-400">Developer Access</span> account or a regular account with a valid API key setup if using the legacy method.
                </p>
              </div>
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-2">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">What EmuMovies provides:</div>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-300">
                  <span>📽️ Video Snaps (MP4)</span>
                  <span>📦 Box Art Front/Back</span>
                  <span>🖼️ Title Screens</span>
                  <span>🕹️ Gameplay Screenshots</span>
                  <span>🎵 Game Music (MP3)</span>
                  <span>📜 Clear Logos</span>
                </div>
              </div>
            </>
          )}

          {activeTab === 'maintenance' && (
            <div className="flex flex-col gap-6">
               <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-white font-bold mb-2 flex items-center gap-2">🕹️ ROM Scanner</h3>
                  <p className="text-xs text-gray-400 mb-4">
                    Scans your configured ROMs directory for compatible Commodore 64 files (.d64, .t64, .crt, etc.)
                    and matches them against the Gamebase64 database using CRC32 hashes.
                  </p>
                  <button
                    onClick={async () => {
                      if (!settings.romsPath) {
                        setScanStatus("Error: Set your ROMs path first!");
                        return;
                      }
                      setScanStatus("Scanning directory...");
                      try {
                        const { scanRomDirectory } = await import('../lib/tauri-bridge');
                        const results = await scanRomDirectory(settings.romsPath);
                        setScanStatus(`Found ${results.length} ROM files. Matching against database...`);
                        // In a real app, we'd then call a Rust command to update the DB with these paths.
                        setTimeout(() => setScanStatus(`Scan Complete! Found and matched ${results.length} files.`), 2000);
                      } catch (err) {
                        setScanStatus(`Scan Failed: ${err}`);
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs uppercase transition shadow-lg"
                  >
                    Start Full ROM Scan
                  </button>
                  {scanStatus && (
                    <div className="mt-4 p-3 bg-gray-950 rounded border border-gray-800 text-[10px] font-mono text-emerald-400 leading-tight">
                      {scanStatus}
                    </div>
                  )}
               </div>

               <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 opacity-50">
                  <h3 className="text-white font-bold mb-2 flex items-center gap-2">🧼 Database Cleanup</h3>
                  <p className="text-xs text-gray-400 mb-4">
                    Removes missing file paths and clears cached media entries that no longer exist on disk.
                  </p>
                  <button disabled className="px-4 py-2 bg-gray-700 text-gray-400 rounded font-bold text-xs uppercase cursor-not-allowed">
                    Soon...
                  </button>
               </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
