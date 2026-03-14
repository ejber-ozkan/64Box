"use client";

import { MutableRefObject, RefObject } from 'react';
import { DetailNavigationHook } from '../../../hooks/useDetailNavigation';
import { SteamGalleryCard } from './SteamGalleryCard';
import { Extra } from '../../../types/game';

interface SteamExtrasGalleryPanelProps {
  extrasPath: string | undefined;
  galleryCardRefs: MutableRefObject<Array<HTMLButtonElement | null>>;
  galleryExtras: Extra[];
  gallerySectionRef: RefObject<HTMLDivElement | null>;
  gallerySelectionIndex: number;
  nav: DetailNavigationHook;
  onHoverCard: (index: number) => void;
  onOpenCard: (extra: Extra, index: number) => void;
  visibleTab: 'gallery' | 'extras' | 'extras-gallery';
}

export function SteamExtrasGalleryPanel({
  extrasPath,
  galleryCardRefs,
  galleryExtras,
  gallerySectionRef,
  gallerySelectionIndex,
  nav,
  onHoverCard,
  onOpenCard,
  visibleTab,
}: SteamExtrasGalleryPanelProps) {
  if (galleryExtras.length === 0) {
    return (
      <div className="p-12 bg-[#0f1922]/40 rounded-xl border border-[#2a475e]/30 text-center italic text-gray-500">
        No extra gallery media is available for this title.
      </div>
    );
  }

  return (
    <div ref={gallerySectionRef} className="space-y-4 scroll-mt-24">
      <div className="flex items-center gap-3">
        <h3 className="text-white font-semibold uppercase tracking-[0.18em] text-sm">Extras Gallery</h3>
        <div className="h-px flex-1 bg-gradient-to-r from-[#2a475e] to-transparent" />
      </div>
      <div
        onMouseEnter={() => nav.hoverZone('media-extras')}
        className={`rounded-2xl border bg-[#0f1922]/60 p-4 xl:p-5 transition-all ${
          nav.focusedZone === 'media-extras' && visibleTab === 'extras-gallery'
            ? 'border-yellow-300/80 shadow-[0_0_0_1px_rgba(250,204,21,0.45)]'
            : 'border-[#2a475e]/60'
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8f98a0]">Gallery & Media</p>
            <p className="text-sm text-[#c6d4df]/80">Use D-pad, stick, or arrow keys to browse the extra artwork.</p>
          </div>
          <div className="rounded-full border border-[#66c0f4]/30 bg-[#66c0f4]/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[#66c0f4]">
            {gallerySelectionIndex + 1} / {galleryExtras.length}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {galleryExtras.map((extra, index) => (
            <SteamGalleryCard
              key={extra.id}
              extra={extra}
              extrasPath={extrasPath}
              ref={(element) => {
                galleryCardRefs.current[index] = element;
              }}
              selected={nav.focusedZone === 'media-extras' && visibleTab === 'extras-gallery' && gallerySelectionIndex === index}
              onClick={() => onOpenCard(extra, index)}
              onHover={() => onHoverCard(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
