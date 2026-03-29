"use client";

import { RefObject } from 'react';
import { ImageSlider } from '../../ImageSlider';
import { ImageWithFallback } from '../../ImageWithFallback';
import { Game } from '../../../types/game';
import { DetailNavigationHook } from '../../../hooks/useDetailNavigation';
import { FullscreenLayoutMetrics } from '../../../hooks/useFullscreenLayoutMetrics';

interface SteamGalleryPanelProps {
  boxArtUrl: string;
  game: Game;
  gameplaySectionRef: RefObject<HTMLDivElement | null>;
  hasBoxArt: boolean;
  hasGameplayMedia: boolean;
  hasGalleryExtras: boolean;
  hasTitleMedia: boolean;
  layout?: FullscreenLayoutMetrics;
  nav: DetailNavigationHook;
  onFullscreen: (filename: string | null) => void;
  resolveScreenshotPath: (filename: string | null) => string;
  titleSectionRef: RefObject<HTMLDivElement | null>;
}

export function SteamGalleryPanel({
  boxArtUrl,
  game,
  gameplaySectionRef,
  hasBoxArt,
  hasGameplayMedia,
  hasGalleryExtras,
  hasTitleMedia,
  layout,
  nav,
  onFullscreen,
  resolveScreenshotPath,
  titleSectionRef,
}: SteamGalleryPanelProps) {
  if (!hasGameplayMedia && !hasTitleMedia && !hasBoxArt && !hasGalleryExtras) {
    return (
      <div className="p-12 bg-[#0f1922]/40 rounded-xl border border-[#2a475e]/30 text-center italic text-gray-500">
        No gallery media is available for this title.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(hasGameplayMedia || hasTitleMedia || hasBoxArt) && (
        <div
          className={`grid ${
            hasGameplayMedia && (hasTitleMedia || hasBoxArt)
              ? layout?.detailUseStackedColumns
                ? 'grid-cols-1'
                : 'xl:grid-cols-[minmax(0,1.45fr)_minmax(240px,0.82fr)]'
              : 'grid-cols-1'
          }`}
          style={{ gap: `${Math.max((layout?.detailSectionGap ?? 20) - 2, 16)}px` }}
        >
          {hasGameplayMedia && (
            <div
              ref={gameplaySectionRef}
              onClick={() => onFullscreen(game.screenshotFilename)}
              onMouseEnter={() => nav.hoverZone('media-gameplay')}
              className={`aspect-[16/9] min-h-[340px] xl:min-h-[460px] 2xl:min-h-[540px] bg-[#0f1922] rounded shadow-md border border-[#2a475e] flex items-center justify-center p-3 transition cursor-pointer relative group overflow-hidden ${nav.focusCls('media-gameplay')}`}
              style={layout ? {
                minHeight: `${layout.detailStageMinHeight}px`,
                maxHeight: `${layout.detailStageMaxHeight}px`,
              } : undefined}
            >
              {game.videoSnapFilename ? (
                <video src={resolveScreenshotPath(game.videoSnapFilename)} autoPlay loop muted className="w-full h-full object-contain pointer-events-none" />
              ) : (
                <ImageSlider type="screenshot" filename={game.screenshotFilename} alt="Screenshot" className="w-full h-full object-contain pointer-events-none" fallbackText="Gameplay" />
              )}
              <div className="absolute top-3 left-3 bg-black/80 px-2 rounded text-[10px] text-white uppercase tracking-widest">Gameplay</div>
            </div>
          )}

          {(hasTitleMedia || hasBoxArt) && (
            <div className="grid gap-5 grid-cols-1">
              {hasTitleMedia && (
                <div
                  ref={titleSectionRef}
                  onClick={() => onFullscreen(game.titlescreenFilename)}
                  onMouseEnter={() => nav.hoverZone('media-titlescreen')}
                  className={`aspect-[16/9] bg-[#0f1922] rounded shadow-md border border-[#2a475e] flex items-center justify-center p-3 transition cursor-pointer relative overflow-hidden ${nav.focusCls('media-titlescreen')}`}
                >
                  <ImageWithFallback src={resolveScreenshotPath(game.titlescreenFilename)} alt="Title" fit="contain" className="w-full h-full pointer-events-none" fallbackText="Title Screen" />
                  <div className="absolute top-3 left-3 bg-black/80 px-2 rounded text-[10px] text-white uppercase tracking-widest">Title</div>
                </div>
              )}

              {hasBoxArt && (
                <div
                  className="aspect-[4/5] bg-[#0f1922] rounded shadow-md border border-[#2a475e] flex items-center justify-center p-4 relative overflow-hidden"
                  style={layout ? { maxHeight: `${Math.max(layout.detailStageMaxHeight - 100, 280)}px` } : undefined}
                >
                  <ImageWithFallback src={boxArtUrl} alt="Box Art" fit="contain" className="w-full h-full pointer-events-none" fallbackText="Box Front" />
                  <div className="absolute top-3 left-3 bg-black/80 px-2 rounded text-[10px] text-white uppercase tracking-widest">Box Art</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
