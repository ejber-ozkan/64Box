"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { getSecureSetting, saveSecureSetting } from '../lib/tauri-bridge';

interface Settings {
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
  theGamesDbApiKey: string;
  hideAdultContent: boolean;
  recentlyPlayedIds: string[];
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
  theGamesDbApiKey: '',
  hideAdultContent: false,
  recentlyPlayedIds: [],
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const SECURE_FIELDS = ['emuMoviesPassword', 'screenScraperPassword', 'theGamesDbApiKey'] as const;

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

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => {
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
          SECURE_FIELDS.forEach(field => delete toSave[field]);
          localStorage.setItem('gb64_settings', JSON.stringify(toSave));
        } catch (e) {
          console.error('Failed to save settings to localStorage', e);
        }
      }
      return updated;
    });
  };


  const resolveMediaPath = (type: 'screenshot' | 'sound' | 'musician' | 'extras', filename: string) => {
    // In a real desktop app (Phase 3), Tauri would resolve these local absolute paths.
    // For web/MVP, we join the configured base path with the filename.
    switch (type) {
      case 'screenshot':
        return `${settings.screenshotsPath}/${filename}`;
      case 'sound':
        return `${settings.soundsPath}/${filename}`;
      case 'musician':
        return `${settings.musicianPhotosPath}/${filename}`;
      case 'extras' as any:
        return `${settings.extrasPath}/${filename}`;
      default:
        return filename;
    }
  };

  const findAllVariants = async (type: 'screenshot' | 'sound' | 'musician' | 'extras', filename: string): Promise<string[]> => {
    if (typeof window === 'undefined') return [];
    
    // In browser web dev mode without Tauri API loaded, just return local resolve once
    try {
      const { findAllMediaVariants, getMediaUrl } = await import('../lib/tauri-bridge');
      let baseDir = settings.screenshotsPath;
      if (type === 'sound') baseDir = settings.soundsPath;
      if (type === 'musician') baseDir = settings.musicianPhotosPath;

      const variants = await findAllMediaVariants(baseDir, filename);
      
      // Map to object URLs to bypass Tauri asset scope restrictions for dynamically selected folders
      const urls = await Promise.all(variants.map(v => getMediaUrl(v)));
      return urls;
    } catch {
      return [resolveMediaPath(type, filename)];
    }
  };
  
  const markAsPlayed = (gameId: string) => {
    setSettings(prev => {
      const newList = [gameId, ...prev.recentlyPlayedIds.filter(id => id !== gameId)].slice(0, 12);
      const updated = { ...prev, recentlyPlayedIds: newList };
      if (typeof window !== 'undefined') {
        localStorage.setItem('gb64_settings', JSON.stringify(updated));
      }
      return updated;
    });
  };

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
