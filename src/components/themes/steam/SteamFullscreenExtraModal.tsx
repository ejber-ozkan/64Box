"use client";

import { ImageWithFallback } from '../../ImageWithFallback';
import { usePopupOpenSound } from '../../../hooks/usePopupOpenSound';

interface SteamFullscreenExtraModalProps {
  caption: string;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  src: string;
  title: string;
}

export function SteamFullscreenExtraModal({
  caption,
  onClose,
  onNext,
  onPrevious,
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
          {onPrevious ? (
            <button
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/60 px-4 py-5 text-3xl text-white transition-colors hover:border-yellow-300/60 hover:text-yellow-300"
              onClick={onPrevious}
            >
              ‹
            </button>
          ) : null}
          <ImageWithFallback
            src={src}
            alt={title}
            fit="contain"
            className="max-h-full max-w-full rounded-lg border border-white/10 shadow-2xl"
          />
          {onNext ? (
            <button
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/60 px-4 py-5 text-3xl text-white transition-colors hover:border-yellow-300/60 hover:text-yellow-300"
              onClick={onNext}
            >
              ›
            </button>
          ) : null}
        </div>
        <div className="absolute bottom-5 left-5 rounded-xl bg-black/70 px-4 py-3 backdrop-blur-md">
          <p className="text-lg font-semibold text-white">{title}</p>
          <p className="text-xs uppercase tracking-[0.22em] text-white/60">{caption}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/50">Left / Right to browse • B / Esc to close</p>
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
