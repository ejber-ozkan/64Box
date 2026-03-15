"use client";

import { ImageWithFallback } from '../../ImageWithFallback';
import { usePopupOpenSound } from '../../../hooks/usePopupOpenSound';

interface SteamFullscreenExtraModalProps {
  caption: string;
  onClose: () => void;
  src: string;
  title: string;
}

export function SteamFullscreenExtraModal({
  caption,
  onClose,
  src,
  title,
}: SteamFullscreenExtraModalProps) {
  usePopupOpenSound(true, 'steam-fullscreen-extra');

  return (
    <div
      data-detail-modal="open"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-8 backdrop-blur-md"
      onClick={onClose}
    >
      <div className="relative flex h-[min(92vh,1400px)] w-[min(96vw,2200px)] flex-col items-center justify-center gap-4" onClick={(event) => event.stopPropagation()}>
        <div className="flex h-full w-full items-center justify-center px-6 pb-24 pt-6">
          <ImageWithFallback
            src={src}
            alt={title}
            fit="contain"
            className="max-h-full max-w-full rounded-lg border border-white/10 shadow-2xl"
          />
        </div>
        <div className="absolute bottom-5 left-5 rounded-xl bg-black/70 px-4 py-3 backdrop-blur-md">
          <p className="text-lg font-semibold text-white">{title}</p>
          <p className="text-xs uppercase tracking-[0.22em] text-white/60">{caption}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/50">B / Esc to close</p>
        </div>
        <button
          className="absolute right-0 top-0 p-4 text-4xl font-light text-white transition-colors hover:text-yellow-400"
          onClick={onClose}
        >
          ×
        </button>
      </div>
    </div>
  );
}
