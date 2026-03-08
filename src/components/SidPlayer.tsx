"use client";

import { useState, useRef, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { downloadMediaAsset, resolveMediaPath, getMediaUrl } from '../lib/tauri-bridge';

declare global {
  interface Window {
    jsSID: any;
    SIDplayer: any;
    jsSID_aCtx: any;
  }
}

interface SidPlayerProps {
  filename: string | null;
  audioUrl?: string;
}

export function SidPlayer({ filename, audioUrl }: SidPlayerProps) {
  const { settings } = useSettings();
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [localUrl, setLocalUrl] = useState<string | undefined>(audioUrl);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    setLocalUrl(audioUrl);
  }, [audioUrl]);

  // Check if SID exists on mount or if we just downloaded it
  useEffect(() => {
    async function checkLocalScrape() {
      if (!filename || localUrl || !settings.scrapedMediaPath) return;
      try {
        const safeName = filename.replace(/\\/g, '/');
        const res = await resolveMediaPath(settings.scrapedMediaPath, safeName);
        if (res.exists) {
           // Provide a direct file:// mapping for Tauri frontend once we implement asset serving.
           // For MVP, we pass the absolute path down (or use the web fallback)
           setLocalUrl(`file://${res.absolute_path}`);
        }
      } catch {
        // Ignored
      }
    }
    checkLocalScrape();
  }, [filename, localUrl, settings.scrapedMediaPath]);

  // Play/Pause effect using jsSID
  useEffect(() => {
    const playSid = async () => {
      if (isPlaying && localUrl) {
        if (typeof window !== 'undefined' && window.SIDplayer) {
          try {
            let finalUrl = localUrl;
            if (localUrl.startsWith('file://')) {
              // Strip file:// and optionally leading slash before C:
              let path = localUrl.replace('file://', '');
              if (path.startsWith('/') && path.charAt(2) === ':') {
                 path = path.substring(1); // /C:/... -> C:/...
              }
              finalUrl = await getMediaUrl(path);
            }
            console.log(`[SidPlayer] Loading URL into jsSID: ${finalUrl}`);
            window.SIDplayer.loadstart(finalUrl, 0);
            window.SIDplayer.setvolume(volume);
          } catch (e) {
            console.error("Failed to load or process SID", e);
            setDownloadError("Audio Error: " + String(e));
          }
        }
      } else {
        if (typeof window !== 'undefined' && window.SIDplayer) {
          try {
            window.SIDplayer.pause();
          } catch (err) {
            console.warn('SIDplayer pause ignored:', err);
          }
        }
      }
    };
    playSid();
  }, [isPlaying, localUrl, volume]);

  // Volume effect
  useEffect(() => {
    if (typeof window !== 'undefined' && window.SIDplayer) {
      window.SIDplayer.setvolume(volume);
    }
  }, [volume]);

  // React cleanup when component unmounts or track changes
  useEffect(() => {
    setIsPlaying(false);
    setDownloadError(null);
  }, [filename]);

  const handleScrape = async () => {
    if (!filename || !settings.scrapedMediaPath) {
      setDownloadError("Configure your Scraped Media folder in Settings first!");
      return;
    }
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const hvscUrl = `https://hvsc.c64.org/download/C64Music/${filename.replace(/\\/g, '/')}`;
      const result = await downloadMediaAsset(hvscUrl, settings.scrapedMediaPath, filename);
      if (result.exists) {
        setLocalUrl(`file://${result.absolute_path}`);
      } else {
        setDownloadError("Failed to verify downloaded file.");
      }
    } catch (err) {
      setDownloadError(String(err));
    } finally {
      setIsDownloading(false);
    }
  };

  if (!filename) {
    return <div className="text-gray-500 text-sm">No SID track available</div>;
  }

  return (
    <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between font-mono text-sm max-w-full">
         <span className="truncate text-emerald-400 mr-2" title={filename}>🎵 {filename.split(/[\\/]/).pop()}</span>
         <span className="text-[10px] text-gray-500 shrink-0">{isPlaying ? 'PLAYING' : 'STOPPED'}</span>
      </div>
      
      <div className="flex items-center gap-4">
        {localUrl ? (
          <button
            id="sid-play-btn"
            className={`flex shrink-0 items-center justify-center w-10 h-10 rounded-full transition-colors ${isPlaying ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
            onClick={() => {
              if (!isPlaying) {
                if (typeof window !== 'undefined') {
                  if (!window.jsSID) {
                    setDownloadError("jsSID engine not loaded. Try refreshing the page.");
                    return;
                  }
                  if (!window.SIDplayer) {
                    window.SIDplayer = new window.jsSID(16384, 0.0005);
                  }
                  if (window.jsSID_aCtx && window.jsSID_aCtx.state === 'suspended') {
                    window.jsSID_aCtx.resume();
                  }
                }
              }
              setDownloadError(null);
              setIsPlaying(!isPlaying);
            }}
            data-testid="play-button"
            title="Play SID"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        ) : (
          <button
            id="sid-play-btn"
            className="flex shrink-0 items-center justify-center h-10 px-3 py-1 rounded-lg transition-colors bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
            onClick={handleScrape}
            disabled={isDownloading}
            title="Download from the High Voltage SID Collection"
          >
            {isDownloading ? 'Scraping...' : '⬇ Scrape HVSC'}
          </button>
        )}


        {localUrl && (
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-gray-500">🔈</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
              data-testid="volume-slider"
            />
          </div>
        )}
      </div>

      {downloadError && (
        <div className="text-[10px] text-red-400 leading-tight">
          ⚠ {downloadError}
        </div>
      )}
    </div>
  );
}
