"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { getSecureSetting, saveSecureSetting } from '../lib/tauri-bridge';

export interface Settings {
  screenshotsPath: string;
  soundsPath: string;
  musicianPhotosPath: string;
  romsPath: string;
  emulatorPath: string;
  emuMoviesUsername: string;
  emuMoviesPassword: string;
  detailViewTheme: 'cia' | 'vic' | 'sx64';
  scrapedMediaPath: string;
  extrasPath: string;
  activeScraper: 'emumovies' | 'screenscraper' | 'thegamesdb';
  screenScraperUsername: string;
  screenScraperPassword: string;
  screenScraperDevId: string;
  screenScraperDevPassword: string;
  theGamesDbApiKey: string;
  hideAdultContent: boolean;
  recentlyPlayedIds: string[];
  retroarchPath: string;
  retroarchCorePath: string;
  preferredEmulator: 'vice' | 'retroarch';
  imageAnimation: 'none' | 'slide';
  imageCycling: boolean;
  lastSelectedGameId: string | null;
  lastFocusedIndex: number;
  lastViewMode: 'grid' | 'list';
  isFullscreen: boolean;
  displayResolution: string; // presets like "720p", "1080p", "default"
  windowWidth: number;
  windowHeight: number;
  mouseHoverSelection: boolean;
  scrollNavigation: boolean;
  bigBoxAnimateVertical: boolean;
  confirmFullscreenExit: boolean;
  lastBigBoxRailId: string | null;
  lastBigBoxGameId: string | null;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  resolveMediaPath: (type: 'screenshot' | 'sound' | 'musician' | 'extras', filename: string) => string;
  findAllVariants: (type: 'screenshot' | 'sound' | 'musician' | 'extras', filename: string) => Promise<string[]>;
  markAsPlayed: (gameId: string) => void;
}

const defaultSettings: Settings = {
  screenshotsPath: '/media/screenshots',
  soundsPath: '/media/sounds',
  musicianPhotosPath: '/media/musicians',
  romsPath: '',
  emulatorPath: '',
  emuMoviesUsername: '',
  emuMoviesPassword: '',
  detailViewTheme: 'cia',
  scrapedMediaPath: '/media/scraped',
  extrasPath: '/media/extras',
  activeScraper: 'emumovies',
  screenScraperUsername: '',
  screenScraperPassword: '',
  screenScraperDevId: '',
  screenScraperDevPassword: '',
  theGamesDbApiKey: '',
  hideAdultContent: false,
  recentlyPlayedIds: [],
  retroarchPath: '',
  retroarchCorePath: '',
  preferredEmulator: 'vice',
  imageAnimation: 'none',
  imageCycling: true,
  lastSelectedGameId: null,
  lastFocusedIndex: 0,
  lastViewMode: 'grid',
  isFullscreen: false,
  displayResolution: 'default',
  windowWidth: 1200,
  windowHeight: 800,
  mouseHoverSelection: true,
  scrollNavigation: true,
  bigBoxAnimateVertical: true,
  confirmFullscreenExit: true,
  lastBigBoxRailId: null,
  lastBigBoxGameId: null,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const SECURE_FIELDS = ['emuMoviesPassword', 'screenScraperPassword', 'screenScraperDevPassword', 'theGamesDbApiKey'] as const;

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // Initialize and load
  useEffect(() => {
    async function initializeSettings() {
      // 1. Load basic settings from localStorage
      let localValues: Partial<Settings> = {};
      try {
        const saved = localStorage.getItem('gb64_settings');
        if (saved) {
          localValues = JSON.parse(saved);
        }
      } catch (e) {
        console.error('Failed to load settings from localStorage', e);
      }

      // 2. Load secure settings from Rust/SQLite
      const secureValues: Partial<Settings> = {};
      for (const field of SECURE_FIELDS) {
        try {
          const value = await getSecureSetting(field);
          if (value) {
            secureValues[field] = value;
          } else if (localValues[field]) {
            // 3. MIGRATION: If found in localStorage but NOT in secure storage, move it
            console.log(`Migrating ${field} to secure storage...`);
            await saveSecureSetting(field, localValues[field] as string);
            secureValues[field] = localValues[field];
          }
        } catch (err) {
          console.error(`Error loading/migrating secure field ${field}:`, err);
        }
      }

      // 4. Sanitize localStorage (remove secure fields)
      const sanitizedLocal = { ...localValues };
      let needsSanitization = false;
      SECURE_FIELDS.forEach(field => {
        if (sanitizedLocal[field]) {
          delete sanitizedLocal[field];
          needsSanitization = true;
        }
      });
      if (needsSanitization) {
        localStorage.setItem('gb64_settings', JSON.stringify(sanitizedLocal));
      }

      // 5. Set final combined state
      setSettings({
        ...defaultSettings,
        ...sanitizedLocal,
        ...secureValues
      });
      setIsLoaded(true);
    }

    if (typeof window !== 'undefined') {
      initializeSettings();
    }
  }, []);

  // Apply window settings when they change
  useEffect(() => {
    if (isLoaded) {
      import('../lib/tauri-bridge').then(({ setWindowMode }) => {
        let w = settings.windowWidth;
        let h = settings.windowHeight;

        // Overlay preset if not "default"
        if (settings.displayResolution !== 'default') {
          const [pw, ph] = settings.displayResolution.split('x').map(Number);
          if (!isNaN(pw) && !isNaN(ph)) {
            w = pw;
            h = ph;
          }
        }
        
        setWindowMode(settings.isFullscreen, w, h);
      });
    }
  }, [isLoaded, settings.isFullscreen, settings.displayResolution, settings.windowWidth, settings.windowHeight]);

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings((prev) => {
      // Check if anything actually changed to avoid unnecessary state updates
      const hasChange = Object.entries(newSettings).some(([k, v]) => prev[k as keyof Settings] !== v);
      if (!hasChange) return prev;

      const updated = { ...prev, ...newSettings };
      
      // 1. Persist sensitive fields to Secure storage (Rust/SQLite)
      SECURE_FIELDS.forEach(field => {
        if (newSettings[field] !== undefined) {
          saveSecureSetting(field, newSettings[field] as string);
        }
      });

      // 2. Persist others to localStorage (JSON)
      if (typeof window !== 'undefined') {
        try {
          const toSave = { ...updated };
          // Remove secure fields from localStorage object
          SECURE_FIELDS.forEach(field => delete toSave[field as keyof Settings]);
          localStorage.setItem('gb64_settings', JSON.stringify(toSave));
        } catch (e) {
          console.error('Failed to save settings to localStorage', e);
        }
      }
      return updated;
    });
  }, []);


  const resolveMediaPath = useCallback((type: 'screenshot' | 'sound' | 'musician' | 'extras', filename: string) => {
    switch (type) {
      case 'screenshot':
        return `${settings.screenshotsPath}/${filename}`;
      case 'sound':
        return `${settings.soundsPath}/${filename}`;
      case 'musician':
        return `${settings.musicianPhotosPath}/${filename}`;
      case 'extras':
        return `${settings.extrasPath}/${filename}`;
      default:
        return filename;
    }
  }, [settings.screenshotsPath, settings.soundsPath, settings.musicianPhotosPath, settings.extrasPath]);

  const findAllVariants = useCallback(async (type: 'screenshot' | 'sound' | 'musician' | 'extras', filename: string): Promise<string[]> => {
    if (typeof window === 'undefined') return [];
    
    try {
      const { findAllMediaVariants, getMediaUrl } = await import('../lib/tauri-bridge');
      let baseDir = settings.screenshotsPath;
      if (type === 'sound') baseDir = settings.soundsPath;
      if (type === 'musician') baseDir = settings.musicianPhotosPath;

      const variants = await findAllMediaVariants(baseDir, filename);
      
      const urls = await Promise.all(variants.map(v => getMediaUrl(v)));
      return urls;
    } catch {
      return [resolveMediaPath(type, filename)];
    }
  }, [settings.screenshotsPath, settings.soundsPath, settings.musicianPhotosPath, resolveMediaPath]);
  
  const markAsPlayed = useCallback((gameId: string) => {
    setSettings(prev => {
      const newList = [gameId, ...prev.recentlyPlayedIds.filter(id => id !== gameId)].slice(0, 12);
      // Only update if the list actually changed (different head or different content)
      if (prev.recentlyPlayedIds[0] === gameId && prev.recentlyPlayedIds.length === newList.length) {
         return prev;
      }
      
      const updated = { ...prev, recentlyPlayedIds: newList };
      if (typeof window !== 'undefined') {
        localStorage.setItem('gb64_settings', JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resolveMediaPath, findAllVariants, markAsPlayed }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
