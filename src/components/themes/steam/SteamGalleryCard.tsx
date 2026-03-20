"use client";

import { forwardRef, useEffect, useState } from 'react';
import { ImageWithFallback } from '../../ImageWithFallback';
import { getAssetUrl } from '../../../lib/tauri-bridge';
import { buildExtraAbsolutePath, getExtraSourceLabel, isImageExtra, isVideoExtra } from '../../../lib/steam-extras';
import { Extra } from '../../../types/game';

interface SteamGalleryCardProps {
  extra: Extra;
  extrasPath: string | undefined;
  selected: boolean;
  onClick: () => void;
  onHover: () => void;
}

export const SteamGalleryCard = forwardRef<HTMLButtonElement, SteamGalleryCardProps>(function SteamGalleryCard({
  extra,
  extrasPath,
  selected,
  onClick,
  onHover,
}, ref) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      if (!extrasPath || !isImageExtra(extra)) {
        setPreviewUrl('');
        return;
      }

      const assetUrl = await getAssetUrl(buildExtraAbsolutePath(extrasPath, extra.path));
      if (!cancelled) {
        setPreviewUrl(assetUrl);
      }
    }

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [extra, extrasPath]);

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseEnter={onHover}
      className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition-all ${
        selected
          ? 'border-yellow-300 bg-white/10 shadow-[0_0_0_2px_rgba(250,204,21,0.7),0_20px_40px_rgba(0,0,0,0.35)]'
          : 'border-[#2a475e]/70 bg-[#1a2430] hover:border-[#66c0f4]/50 hover:bg-[#223041]'
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#0b141d]">
        {previewUrl ? (
          <ImageWithFallback
            src={previewUrl}
            alt={extra.name}
            fit="contain"
            className="h-full w-full bg-[#0b141d] p-2 object-contain transition-transform duration-500 group-hover:scale-[1.02]"
            fallbackText={extra.name}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#24384b,transparent_70%)] text-4xl">
            {isVideoExtra(extra) ? '🎬' : '🖼'}
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-black/75 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-white">
          {isVideoExtra(extra) ? 'Media' : 'Artwork'}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{extra.name}</p>
          <p className="truncate text-[11px] uppercase tracking-[0.22em] text-[#8f98a0]">{getExtraSourceLabel(extra)}</p>
        </div>
        <span className="text-xs uppercase tracking-[0.22em] text-[#66c0f4]">View</span>
      </div>
    </button>
  );
});
