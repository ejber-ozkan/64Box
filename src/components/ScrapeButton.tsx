"use client";

import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Game } from '../types/game';
import { searchEmuMovies, downloadEmuMoviesAsset } from '../lib/emumovies';
import { searchScreenScraper } from '../lib/screenscraper';
import { searchTheGamesDB } from '../lib/thegamesdb';

interface ScrapeButtonProps {
  game: Game;
  className?: string;
  onComplete?: () => void;
}

export function ScrapeButton({ game, className, onComplete }: ScrapeButtonProps) {
  const { settings } = useSettings();
  const [isScraping, setIsScraping] = useState(false);
  const [missingCount, setMissingCount] = useState(0);

  // Identify missing media (Simplified for MVP)
  // In a real app, we'd check if these files exist on disk via Tauri
  useEffect(() => {
    let missing = 0;
    if (!game.screenshotFilename) missing++;
    if (!game.titlescreenFilename) missing++;
    if (!game.boxFrontFilename) missing++;
    // Assume video is missing if not explicitly handled elsewhere
    missing++; 
    setMissingCount(missing);
  }, [game]);

  const handleScrape = async () => {
    if (isScraping) return;
    setIsScraping(true);

    try {
      const { activeScraper } = settings;
      let results: any = null;

      if (activeScraper === 'emumovies') {
        const sr = await searchEmuMovies(
          settings.emuMoviesUsername,
          settings.emuMoviesPassword,
          game.name,
          'Video'
        );
        if (sr.length > 0) {
           await downloadEmuMoviesAsset(sr[0].url, settings.scrapedMediaPath, `${game.id}_video.mp4`);
           alert(`Scraped video from EmuMovies for ${game.name}`);
        }
      } else if (activeScraper === 'screenscraper') {
        results = await searchScreenScraper(
          settings.screenScraperUsername,
          settings.screenScraperPassword,
          game.name // ScreenScraper can search by name if no romname
        );
        if (results) {
           alert(`Found ${results.name} on ScreenScraper with ${results.media.length} assets.`);
           // Simple auto-download of first image for demo
           const img = results.media.find((m: any) => m.type === 'titlescreen' || m.type === 'ss');
           if (img) {
              await downloadEmuMoviesAsset(img.url, settings.scrapedMediaPath, `${game.id}_scraped.jpg`);
           }
        }
      } else if (activeScraper === 'thegamesdb') {
        results = await searchTheGamesDB(settings.theGamesDbApiKey, game.name);
        if (results) {
           alert(`Found ${results.game_title} on TheGamesDB.`);
        }
      }

      onComplete?.();
    } catch (err) {
      console.error('Scraping error:', err);
      alert('Scrape Error: ' + err);
    } finally {
      setIsScraping(false);
    }
  };

  const scraperLabels = {
    emumovies: 'EmuMovies',
    screenscraper: 'ScreenScraper',
    thegamesdb: 'TheGamesDB'
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        onClick={handleScrape}
        disabled={isScraping}
        className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg overflow-hidden group ${
          isScraping 
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/30'
        }`}
      >
        {isScraping && (
           <div className="absolute inset-0 bg-blue-400/20 animate-pulse"></div>
        )}
        
        <span className="text-lg group-hover:rotate-12 transition-transform">
          {isScraping ? '⌛' : '🛰️'}
        </span>
        
        <div className="flex flex-col items-start leading-tight">
          <span>{isScraping ? 'Scraping...' : 'Art & Info Scraper'}</span>
          <span className="text-[9px] opacity-70 font-black">
            via {scraperLabels[settings.activeScraper]}
          </span>
        </div>

        {missingCount > 0 && !isScraping && (
          <div className="ml-auto bg-yellow-500 text-black px-1.5 py-0.5 rounded-md text-[9px] font-black animate-bounce">
            {missingCount} Missing
          </div>
        )}
      </button>
    </div>
  );
}
