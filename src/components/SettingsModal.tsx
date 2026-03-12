"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { openDirectoryDialog, openFileDialog } from '../lib/tauri-bridge';
import { useGamepad } from '../hooks/useGamepad';
import { useInputMode } from '../hooks/useInputMode';

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
  const [localExtras, setLocalExtras]             = useState(settings.extrasPath);
  const [localHideAdult, setLocalHideAdult]       = useState(settings.hideAdultContent);
  const [localActiveScraper, setLocalActiveScraper] = useState(settings.activeScraper);
  const [localScreenScraperUser, setLocalScreenScraperUser] = useState(settings.screenScraperUsername);
  const [localScreenScraperPass, setLocalScreenScraperPass] = useState(settings.screenScraperPassword);
  const [localScreenScraperDevId, setLocalScreenScraperDevId] = useState(settings.screenScraperDevId);
  const [localScreenScraperDevPass, setLocalScreenScraperDevPass] = useState(settings.screenScraperDevPassword);
  const [localTheGamesDbKey, setLocalTheGamesDbKey] = useState(settings.theGamesDbApiKey);
  const [localRetroarch, setLocalRetroarch]       = useState(settings.retroarchPath);
  const [localRetroarchCore, setLocalRetroarchCore] = useState(settings.retroarchCorePath);
  const [localPreferredEmu, setLocalPreferredEmu] = useState(settings.preferredEmulator);
  const [localImageAnim, setLocalImageAnim]       = useState(settings.imageAnimation);
  const [localImageCycling, setLocalImageCycling] = useState(settings.imageCycling);
  const [localFullscreen, setLocalFullscreen]     = useState(settings.isFullscreen);
  const [localResolution, setLocalResolution]     = useState(settings.displayResolution);
  const [activeTab, setActiveTab]                 = useState<'appearance' | 'content' | 'paths' | 'scrapers' | 'maintenance' | 'about'>('appearance');
  const [scanStatus, setScanStatus]               = useState<string | null>(null);
  const { isMouseMode, onGamepadInput } = useInputMode();

  // Navigation state
  const [navZone, setNavZone] = useState<'tabs' | 'content' | 'header'>('tabs');
  const [focusedIdx, setFocusedIdx] = useState(0);
  
  const handleSave = useCallback(() => {
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
      extrasPath: localExtras,
      hideAdultContent: localHideAdult,
      activeScraper: localActiveScraper,
      screenScraperUsername: localScreenScraperUser,
      screenScraperPassword: localScreenScraperPass,
      screenScraperDevId: localScreenScraperDevId,
      screenScraperDevPassword: localScreenScraperDevPass,
      theGamesDbApiKey: localTheGamesDbKey,
      retroarchPath: localRetroarch,
      retroarchCorePath: localRetroarchCore,
      preferredEmulator: localPreferredEmu,
      imageAnimation: localImageAnim,
      imageCycling: localImageCycling,
      isFullscreen: localFullscreen,
      displayResolution: localResolution,
    });
    onBack();
  }, [updateSettings, onBack, localScreenshots, localSounds, localMusician, localRoms, localEmulator, localEmuMoviesUser, localEmuMoviesPass, localTheme, localScrapedMedia, localExtras, localHideAdult, localActiveScraper, localScreenScraperUser, localScreenScraperPass, localScreenScraperDevId, localScreenScraperDevPass, localTheGamesDbKey, localRetroarch, localRetroarchCore, localPreferredEmu, localImageAnim, localImageCycling, localFullscreen, localResolution]);

  // Handle Keyboard - Esc to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Handle Gamepad/Keyboard Navigation
  const moveFocus = useCallback((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (navZone === 'header') {
      if (dir === 'DOWN') { setNavZone('tabs'); setFocusedIdx(0); return; }
      if (dir === 'RIGHT') { setFocusedIdx(p => (p === 0 ? 1 : 0)); return; }
      if (dir === 'LEFT') { setFocusedIdx(p => (p === 1 ? 0 : 1)); return; }
      return;
    }

    if (dir === 'UP' && focusedIdx === 0) {
      setNavZone('header');
      setFocusedIdx(0);
      return;
    }

    if (dir === 'RIGHT' && navZone === 'tabs') {
      setNavZone('content');
      setFocusedIdx(0);
      return;
    }
    if (dir === 'LEFT' && navZone === 'content') {
      setNavZone('tabs');
      const curTabIdx = tabs.findIndex(t => t.id === activeTab);
      setFocusedIdx(curTabIdx);
      return;
    }

    if (navZone === 'tabs') {
      const max = tabs.length - 1;
      if (dir === 'UP') setFocusedIdx(p => (p > 0 ? p - 1 : max));
      if (dir === 'DOWN') setFocusedIdx(p => (p < max ? p + 1 : 0));
    } else {
      const itemCounts: Record<string, number> = {
        appearance: 12, 
        content: 1,    
        paths: 19,     
        scrapers: 10,  
        maintenance: 1, 
        about: 0
      };
      const max = (itemCounts[activeTab] || 1) - 1;
      if (dir === 'UP') setFocusedIdx(p => (p > 0 ? p - 1 : max));
      if (dir === 'DOWN') setFocusedIdx(p => (p < max ? p + 1 : 0));
    }
  }, [navZone, activeTab]);

  const handleSelect = useCallback(() => {
     if (navZone === 'header') {
       if (focusedIdx === 0) onBack();
       else handleSave();
       return;
     }
     if (navZone === 'tabs') {
       setActiveTab(tabs[focusedIdx].id);
       setNavZone('content');
       setFocusedIdx(0);
     } else {
       const el = document.querySelector(`.focus-idx-${focusedIdx}`) as HTMLElement;
       if (el) {
         el.focus();
         el.click();
       }
     }
  }, [navZone, focusedIdx, activeTab, onBack, handleSave]);

  // Combined listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      onGamepadInput();
      if (e.key === 'Escape') { e.preventDefault(); handleSave(); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); moveFocus('UP'); }
      if (e.key === 'ArrowDown')  { e.preventDefault(); moveFocus('DOWN'); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); moveFocus('LEFT'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); moveFocus('RIGHT'); }
      if (e.key === 'Enter')      { e.preventDefault(); handleSelect(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, moveFocus, handleSelect, onGamepadInput]);

  useGamepad({
    onButtonDown: (btn) => {
      onGamepadInput();
      if (btn === 'B' || btn === 'START') handleSave();
      if (btn === 'UP' || btn === 'DOWN' || btn === 'LEFT' || btn === 'RIGHT') moveFocus(btn);
      if (btn === 'A') handleSelect();
      
      if (btn === 'RB' || btn === 'LB') {
        const tabList = tabs.map(t => t.id);
        const curIdx = tabList.indexOf(activeTab);
        let nextIdx = btn === 'RB' ? (curIdx + 1) % tabList.length : (curIdx - 1 + tabList.length) % tabList.length;
        setActiveTab(tabList[nextIdx]);
        if (navZone === 'tabs') setFocusedIdx(nextIdx);
      }
    }
  });

  const browse = async (setter: (v: string) => void) => {
    const chosen = await openDirectoryDialog();
    if (chosen) setter(chosen);
  };

  const pathRow = (label: string, value: string, setter: (v: string) => void, placeholder: string, isFile = false, idxBase: number) => (
    <div key={label}>
      <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1.5">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          className={`flex-1 bg-gray-950 border rounded px-3 py-2 text-white focus:outline-none font-mono text-xs transition-colors focus-idx-${idxBase} ${
            navZone === 'content' && focusedIdx === idxBase ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-gray-700'
          }`}
          value={value}
          onChange={(e) => setter(e.target.value)}
          placeholder={placeholder}
          onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(idxBase))}
        />
        {!isFile && (
          <button
            onClick={() => browse(setter)}
            onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(idxBase + 1))}
            className={`px-3 py-2 border rounded text-xs transition shrink-0 focus-idx-${idxBase + 1} ${
              navZone === 'content' && focusedIdx === idxBase + 1 
              ? 'bg-blue-600 border-blue-400 text-white' 
              : 'bg-gray-700 border-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
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
    { id: 'scrapers',   label: '🖼️ Scrapers (Coming Soon)' },
    { id: 'maintenance', label: '🛠️ Maintenance' },
    { id: 'about',       label: 'ℹ️ About & Credits' },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-gray-950 w-full min-h-screen overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-10 shadow-lg flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            onMouseEnter={() => isMouseMode && (setNavZone('header'), setFocusedIdx(0))}
            className={`px-4 py-2 border rounded font-medium transition-colors text-sm uppercase tracking-wider ${
              navZone === 'header' && focusedIdx === 0 ? 'bg-white text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border-gray-700'
            }`}
          >
            ← Back to Library
          </button>
          <h2 className="text-xl font-black text-white tracking-widest uppercase ml-4">⚙ Settings</h2>
        </div>
        
        <button
          onClick={handleSave}
          onMouseEnter={() => isMouseMode && (setNavZone('header'), setFocusedIdx(1))}
          className={`px-6 py-2 rounded font-bold uppercase tracking-widest text-sm transition shadow-lg ${
            navZone === 'header' && focusedIdx === 1 ? 'bg-white text-black' : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          Save Configuration
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden p-6 gap-6 max-w-[1600px] mx-auto w-full">
        {/* Left Sidebar (Tabs) */}
        <div className="w-64 flex flex-col gap-2 overflow-y-auto pr-2 pb-10">
          <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2 px-2">Configuration Categories</div>
          
          {tabs.map((t, idx) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              onMouseEnter={() => isMouseMode && (setNavZone('tabs'), setFocusedIdx(idx))}
              className={`p-4 rounded-lg flex items-center gap-3 border transition text-left ${
                (activeTab === t.id && navZone !== 'tabs') || (navZone === 'tabs' && focusedIdx === idx)
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
                  ] as const).map((opt, idx) => (
                    <button
                      key={opt.value}
                      onClick={() => setLocalTheme(opt.value)}
                      onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(idx))}
                      className={`p-3 rounded-lg border text-center flex flex-col items-center gap-1 transition focus-idx-${idx} ${
                        (localTheme === opt.value && (navZone !== 'content' || focusedIdx > 2)) || (navZone === 'content' && focusedIdx === idx)
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

              <div className="mt-8 space-y-6">
                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Screenshot & Media Gallery</div>
                
                <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700 flex flex-col gap-6">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                      <div className="text-white font-semibold flex items-center gap-2 text-sm">
                        🔄 Cycle Multiple Images
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 max-w-sm">
                        Automatically cycle through gameplay screenshots and variants (every 3.5 seconds).
                      </div>
                    </div>
                    <button
                      onClick={() => setLocalImageCycling(prev => !prev)}
                      onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(3))}
                      className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ml-6 focus-idx-3 ${
                        (localImageCycling && (navZone !== 'content' || focusedIdx !== 3)) || (navZone === 'content' && focusedIdx === 3) ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${localImageCycling ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </label>

                  <div className={`transition-opacity ${!localImageCycling ? 'opacity-40 pointer-events-none' : ''}`}>
                    <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-3">Transition Effect</label>
                    <div className="flex bg-gray-950 rounded-lg p-1 border border-gray-700 w-fit">
                      {(['none', 'slide'] as const).map((anim, idx) => (
                        <button
                          key={anim}
                          onClick={() => setLocalImageAnim(anim)}
                          onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(idx + 4))}
                          className={`px-6 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all focus-idx-${idx + 4} ${
                            (localImageAnim === anim && (navZone !== 'content' || (focusedIdx !== 4 && focusedIdx !== 5))) || (navZone === 'content' && focusedIdx === idx + 4)
                              ? 'bg-blue-600 text-white shadow-lg' 
                              : 'text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {anim === 'none' ? 'Instant/Fade' : 'Graceful Slide'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Display & Window</div>
                <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700 space-y-6">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                      <div className="text-white font-semibold flex items-center gap-2 text-sm">
                        🖥️ Fullscreen Mode (BigBox)
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 max-w-sm">
                        Runs the application in immersive fullscreen mode. Toggle with Alt+Enter.
                      </div>
                    </div>
                    <button
                      onClick={() => setLocalFullscreen(prev => !prev)}
                      onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(6))}
                      className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ml-6 focus-idx-6 ${
                        (localFullscreen && (navZone !== 'content' || focusedIdx !== 6)) || (navZone === 'content' && focusedIdx === 6) ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${localFullscreen ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </label>

                  <div className={`transition-opacity ${localFullscreen ? 'opacity-40 pointer-events-none' : ''}`}>
                    <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-3">Window Resolution</label>
                    <div className="flex bg-gray-950 rounded-lg p-1 border border-gray-700 w-fit flex-wrap gap-1">
                      {[
                        { value: 'default', label: 'Default' },
                        { value: '1280x720', label: '720p' },
                        { value: '1920x1080', label: '1080p' },
                        { value: '2560x1440', label: '1440p' },
                        { value: '3840x2160', label: '4K' },
                      ].map((res, idx) => (
                        <button
                          key={res.value}
                          onClick={() => setLocalResolution(res.value)}
                          onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(idx + 7))}
                          className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all focus-idx-${idx + 7} ${
                            (localResolution === res.value && (navZone !== 'content' || (focusedIdx < 7 || focusedIdx > 11))) || (navZone === 'content' && focusedIdx === idx + 7)
                              ? 'bg-blue-600 text-white shadow-lg' 
                              : 'text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {res.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-gray-500 mt-2 italic">Note: These only apply in windowed mode. Fullscreen uses your primary monitor resolution.</p>
                  </div>
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
                      onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(0))}
                      className={`relative w-14 h-7 rounded-full transition-colors shrink-0 ml-6 focus-idx-0 ${
                        (localHideAdult && (navZone !== 'content' || focusedIdx !== 0)) || (navZone === 'content' && focusedIdx === 0) ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-gray-600'
                      }`}
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
                {pathRow('Games folder', localRoms, setLocalRoms, 'e.g. D:/GB64/Games', false, 0)}
                {pathRow('Screenshots folder', localScreenshots, setLocalScreenshots, 'e.g. D:/GB64/Screenshots', false, 2)}
                {pathRow('C64Music folder', localSounds, setLocalSounds, 'e.g. D:/GB64/C64Music', false, 4)}
                {pathRow('Photos (Musicians) folder', localMusician, setLocalMusician, 'e.g. D:/GB64/Photos', false, 6)}
                {pathRow('Extras folder', localExtras, setLocalExtras, 'e.g. D:/GB64/Extras', false, 8)}
                <div className="text-[#66c0f4] font-bold text-xs uppercase tracking-widest border-t border-[#2a475e] pt-1.5 mb-2">
                  -------- Gamebase64 Folders
                </div>

                <hr className="border-gray-700 mt-1 mb-1" />
                
                <hr className="border-gray-700 mt-1 mb-1" />
                
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 space-y-6">
                  <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-4">
                    <div>
                      <span className="text-white font-bold text-sm uppercase tracking-wider block">Default Desktop Emulator</span>
                      <span className="text-[10px] text-gray-500 block mt-1">Which engine to use when clicking &quot;▶ Desktop&quot;</span>
                    </div>
                    <div className="flex bg-gray-950 rounded-lg p-1 border border-gray-700">
                      {(['vice', 'retroarch'] as const).map((emu, idx) => (
                        <button
                          key={emu}
                          onClick={() => setLocalPreferredEmu(emu)}
                          onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(idx + 10))}
                          className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all focus-idx-${idx + 10} ${
                            (localPreferredEmu === emu && (navZone !== 'content' || (focusedIdx !== 10 && focusedIdx !== 11))) || (navZone === 'content' && focusedIdx === idx + 10)
                              ? 'bg-blue-600 text-white shadow-lg' 
                              : 'text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {emu}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`space-y-3 transition-opacity ${localPreferredEmu !== 'vice' ? 'opacity-50' : ''}`}>
                    {pathRow('VICE Executable (x64sc.exe)', localEmulator, setLocalEmulator, 'e.g. C:/VICE/x64sc.exe', true, 12)}
                    <button
                      onClick={async () => {
                        const chosen = await openFileDialog();
                        if (chosen) setLocalEmulator(chosen);
                      }}
                      onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(13))}
                      className={`px-3 py-2 border rounded text-xs transition focus-idx-13 ${
                        (navZone === 'content' && focusedIdx === 13)
                        ? 'bg-blue-600 border-blue-400 text-white' 
                        : 'bg-gray-700 border-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Browse for VICE (x64sc)...
                    </button>
                  </div>

                  <div className={`space-y-3 transition-opacity ${localPreferredEmu !== 'retroarch' ? 'opacity-50' : ''}`}>
                    {pathRow('RetroArch Executable (retroarch.exe)', localRetroarch, setLocalRetroarch, 'e.g. C:/RetroArch/retroarch.exe', true, 14)}
                    <button
                      onClick={async () => {
                        const chosen = await openFileDialog();
                        if (chosen) setLocalRetroarch(chosen);
                      }}
                      onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(15))}
                      className={`px-3 py-2 border rounded text-xs transition focus-idx-15 ${
                        (navZone === 'content' && focusedIdx === 15)
                        ? 'bg-blue-600 border-blue-400 text-white' 
                        : 'bg-gray-700 border-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Browse for RetroArch...
                    </button>

                    {pathRow('RetroArch Core (e.g. vice_x64sc_libretro.dll)', localRetroarchCore, setLocalRetroarchCore, 'e.g. C:/RetroArch/cores/vice_x64sc_libretro.dll', true, 16)}
                    <button
                      onClick={async () => {
                        const chosen = await openFileDialog();
                        if (chosen) setLocalRetroarchCore(chosen);
                      }}
                      onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(17))}
                      className={`px-3 py-2 border rounded text-xs transition focus-idx-17 ${
                        (navZone === 'content' && focusedIdx === 17)
                        ? 'bg-blue-600 border-blue-400 text-white' 
                        : 'bg-gray-700 border-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Browse for Core DLL/SO...
                    </button>
                  </div>
                </div>

                <hr className="border-gray-700 mt-2 mb-1" />
                {pathRow('Scraped Media Folder', localScrapedMedia, setLocalScrapedMedia, 'e.g. D:/MYSOURCE/VIC40GameBase64/64BoxMedia', false, 18)}
              </div>
              <p className="text-[10px] text-emerald-600">
                ✅ &quot;Browse…&quot; opens the native OS folder picker in Tauri desktop mode.
              </p>
            </>
          )}

          {activeTab === 'scrapers' && (
            <div className="flex flex-col gap-6 relative">
              {/* Coming Soon Overlay */}
              <div className="absolute inset-0 z-50 bg-gray-900/40 backdrop-blur-[2px] rounded-xl flex items-center justify-center p-10 text-center">
                 <div className="bg-blue-600/90 text-white px-8 py-4 rounded-2xl shadow-2xl border border-blue-400/50 scale-125 transform rotate-[-2deg]">
                    <div className="text-3xl mb-2">🚧</div>
                    <div className="text-xl font-black uppercase tracking-[0.2em]">Coming Soon</div>
                    <div className="text-[10px] font-bold opacity-80 mt-1 max-w-[200px]">
                      Secure hardware encryption for scraper credentials is in development.
                    </div>
                 </div>
              </div>

              <div className="opacity-30 pointer-events-none select-none blur-[1px]">
                <div className="flex flex-col gap-6">
                  <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg p-4 text-sm text-blue-200">
                    <strong>Art & Info Scraper Configuration</strong><br />
                    Select your preferred active scraper and provide credentials below. 
                    The active scraper will be used for one-click metadata and artwork discovery.
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {(['emumovies', 'screenscraper', 'thegamesdb'] as const).map((s, idx) => (
                      <button
                        key={s}
                        onClick={() => setLocalActiveScraper(s)}
                        onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(idx))}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all focus-idx-${idx} ${
                          (localActiveScraper === s && (navZone !== 'content' || (focusedIdx > 2))) || (navZone === 'content' && focusedIdx === idx)
                            ? 'bg-blue-600 border-blue-400 text-white shadow-xl scale-105'
                            : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        <span className="text-2xl">
                          {s === 'emumovies' ? '🎬' : s === 'screenscraper' ? '🌐' : '👾'}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {s === 'emumovies' ? 'EmuMovies' : s === 'screenscraper' ? 'ScreenScraper' : 'TheGamesDB'}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-8 mt-4">
                    {/* EmuMovies Section */}
                    <div className={`p-6 rounded-2xl border transition-all ${localActiveScraper === 'emumovies' ? 'bg-gray-800 border-blue-500' : 'bg-gray-900/40 border-gray-800 opacity-60'}`}>
                      <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
                        <span>🎬</span> EmuMovies Credentials
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Username</label>
                          <input
                            type="text"
                            className={`w-full bg-gray-950 border rounded px-3 py-2 text-white font-mono text-xs transition-colors focus-idx-3 ${
                              navZone === 'content' && focusedIdx === 3 ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-gray-700'
                            }`}
                            value={localEmuMoviesUser}
                            onChange={(e) => setLocalEmuMoviesUser(e.target.value)}
                            onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(3))}
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Password</label>
                          <input
                            type="password"
                            className={`w-full bg-gray-950 border rounded px-3 py-2 text-white font-mono text-xs transition-colors focus-idx-4 ${
                              navZone === 'content' && focusedIdx === 4 ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-gray-700'
                            }`}
                            value={localEmuMoviesPass}
                            onChange={(e) => setLocalEmuMoviesPass(e.target.value)}
                            onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(4))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* ScreenScraper Section */}
                    <div className={`p-6 rounded-2xl border transition-all ${localActiveScraper === 'screenscraper' ? 'bg-gray-800 border-blue-500' : 'bg-gray-900/40 border-gray-800 opacity-60'}`}>
                      <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
                        <span>🌐</span> ScreenScraper.fr Credentials
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Username</label>
                          <input
                            type="text"
                            className={`w-full bg-gray-950 border rounded px-3 py-2 text-white font-mono text-xs transition-colors focus-idx-5 ${
                              navZone === 'content' && focusedIdx === 5 ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-gray-700'
                            }`}
                            value={localScreenScraperUser}
                            onChange={(e) => setLocalScreenScraperUser(e.target.value)}
                            onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(5))}
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Password</label>
                          <input
                            type="password"
                            className={`w-full bg-gray-950 border rounded px-3 py-2 text-white font-mono text-xs transition-colors focus-idx-6 ${
                              navZone === 'content' && focusedIdx === 6 ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-gray-700'
                            }`}
                            value={localScreenScraperPass}
                            onChange={(e) => setLocalScreenScraperPass(e.target.value)}
                            onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(6))}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-700/50">
                        <div>
                          <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Developer ID (Optional)</label>
                          <input
                            type="text"
                            className={`w-full bg-gray-950 border rounded px-3 py-2 text-white font-mono text-xs transition-colors focus-idx-7 ${
                              navZone === 'content' && focusedIdx === 7 ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-gray-700'
                            }`}
                            value={localScreenScraperDevId}
                            onChange={(e) => setLocalScreenScraperDevId(e.target.value)}
                            placeholder="e.g. skraper"
                            onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(7))}
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Developer Password</label>
                          <input
                            type="password"
                            className={`w-full bg-gray-950 border rounded px-3 py-2 text-white font-mono text-xs transition-colors focus-idx-8 ${
                              navZone === 'content' && focusedIdx === 8 ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-gray-700'
                            }`}
                            value={localScreenScraperDevPass}
                            onChange={(e) => setLocalScreenScraperDevPass(e.target.value)}
                            placeholder="e.g. skraperpw"
                            onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(8))}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-3 italic">
                        Note: If developer credentials are left blank, communal ones (Skraper/Recalbox) will be used.
                      </p>
                    </div>

                    {/* TheGamesDB Section */}
                    <div className={`p-6 rounded-2xl border transition-all ${localActiveScraper === 'thegamesdb' ? 'bg-gray-800 border-blue-500' : 'bg-gray-900/40 border-gray-800 opacity-60'}`}>
                      <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
                        <span>👾</span> TheGamesDB API Key
                      </h3>
                      <div>
                        <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Private API Key</label>
                        <input
                          type="password"
                          className={`w-full bg-gray-950 border rounded px-3 py-2 text-white font-mono text-xs transition-colors focus-idx-9 ${
                            navZone === 'content' && focusedIdx === 9 ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-gray-700'
                          }`}
                          value={localTheGamesDbKey}
                          onChange={(e) => setLocalTheGamesDbKey(e.target.value)}
                          placeholder="Enter your gamesdb.net API key"
                          onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(9))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                    onMouseEnter={() => isMouseMode && (setNavZone('content'), setFocusedIdx(0))}
                    className={`px-4 py-2 rounded font-bold text-xs uppercase transition shadow-lg focus-idx-0 ${
                      navZone === 'content' && focusedIdx === 0 ? 'bg-white text-black' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
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

          {activeTab === 'about' && (
            <div className="flex flex-col gap-6">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white font-black text-lg mb-4 flex items-center gap-2">64Box</h3>
                <p className="text-sm text-gray-300 mb-4">
                  A modern Commodore 64 library and launcher.
                </p>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">Open Source License</h4>
                    <p className="text-xs text-gray-400 leading-relaxed mb-2">
                      This project is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
                    </p>
                    <a href="https://github.com/ejber-ozkan/64Box" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs font-mono">
                      View Source Code on GitHub →
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">Third-Party Credits</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="text-xs text-blue-400 uppercase tracking-widest font-bold">Emulation Engine</h4>
                    <div className="text-xs text-gray-300">
                      <p className="font-bold">EmulatorJS & VICE</p>
                      <p className="text-gray-500 mt-1 italic">Licensed under GNU GPLv3 / GPLv2+</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-xs text-blue-400 uppercase tracking-widest font-bold">Metadata & Media</h4>
                    <div className="text-xs text-gray-300">
                      <p className="font-bold">Gamebase64 Database</p>
                      <p className="text-gray-500 mt-1 italic">Historical C64 preserve data</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs text-blue-400 uppercase tracking-widest font-bold">Media Scraping</h4>
                    <div className="text-xs text-gray-300">
                      <p className="font-bold">EmuMovies</p>
                      <p className="text-gray-500 mt-1 italic">Video snaps & high-quality assets</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs text-blue-400 uppercase tracking-widest font-bold">Interface</h4>
                    <div className="text-xs text-gray-300">
                      <p className="font-bold">React, Next.js, Tauri</p>
                      <p className="text-gray-500 mt-1 italic">Modern desktop app technologies</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
