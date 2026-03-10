"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  hideAdultContent: boolean;
  recentlyPlayedIds: string[];
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  resolveMediaPath: (type: 'screenshot' | 'sound' | 'musician', filename: string) => string;
  findAllVariants: (type: 'screenshot' | 'sound' | 'musician', filename: string) => Promise<string[]>;
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
  detailViewTheme: 'sx64',
  scrapedMediaPath: 'media/scraped',
  hideAdultContent: true,
  recentlyPlayedIds: [],
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    // Load initial state from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('gb64_settings');
        if (saved) {
          return { ...defaultSettings, ...JSON.parse(saved) };
        }
      } catch (e) {
        console.error('Failed to load settings from localStorage', e);
      }
    }
    return defaultSettings;
  });

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      // Save to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('gb64_settings', JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to save settings to localStorage', e);
        }
      }
      return updated;
    });
  };

  const resolveMediaPath = (type: 'screenshot' | 'sound' | 'musician', filename: string) => {
    // In a real desktop app (Phase 3), Tauri would resolve these local absolute paths.
    // For web/MVP, we join the configured base path with the filename.
    switch (type) {
      case 'screenshot':
        return `${settings.screenshotsPath}/${filename}`;
      case 'sound':
        return `${settings.soundsPath}/${filename}`;
      case 'musician':
        return `${settings.musicianPhotosPath}/${filename}`;
      default:
        return filename;
    }
  };

  const findAllVariants = async (type: 'screenshot' | 'sound' | 'musician', filename: string) => {
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
