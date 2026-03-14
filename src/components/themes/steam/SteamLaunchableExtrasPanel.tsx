"use client";

import { MutableRefObject, RefObject } from 'react';
import { DetailNavigationHook } from '../../../hooks/useDetailNavigation';
import { Extra } from '../../../types/game';
import { SteamLaunchableExtraCard } from './SteamLaunchableExtraCard';

interface SteamLaunchableExtrasPanelProps {
  extrasSectionRef: RefObject<HTMLDivElement | null>;
  launchableCardRefs: MutableRefObject<Array<HTMLButtonElement | null>>;
  launchableExtras: Extra[];
  launchableSelectionIndex: number;
  nav: DetailNavigationHook;
  onHoverCard: (index: number) => void;
  onLaunchCard: (extra: Extra, index: number) => void;
  visibleTab: 'gallery' | 'extras' | 'extras-gallery';
}

export function SteamLaunchableExtrasPanel({
  extrasSectionRef,
  launchableCardRefs,
  launchableExtras,
  launchableSelectionIndex,
  nav,
  onHoverCard,
  onLaunchCard,
  visibleTab,
}: SteamLaunchableExtrasPanelProps) {
  return (
    <div ref={extrasSectionRef} className="flex-1 overflow-x-hidden scroll-mt-24">
      {launchableExtras.length > 0 ? (
        <div
          onMouseEnter={() => nav.hoverZone('media-extras')}
          className={`rounded-2xl border bg-[#0f1922]/60 p-4 xl:p-5 transition-all ${
            nav.focusedZone === 'media-extras' && visibleTab === 'extras'
              ? 'border-yellow-300/80 shadow-[0_0_0_1px_rgba(250,204,21,0.45)]'
              : 'border-[#2a475e]/60'
          }`}
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8f98a0]">Alternate Versions</p>
              <p className="text-sm text-[#c6d4df]/80">Launch tape, disk, and cartridge variants directly from this page.</p>
            </div>
            <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-emerald-300">
              {launchableSelectionIndex + 1} / {launchableExtras.length}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {launchableExtras.map((extra, index) => (
              <SteamLaunchableExtraCard
                key={extra.id}
                extra={extra}
                ref={(element) => {
                  launchableCardRefs.current[index] = element;
                }}
                selected={nav.focusedZone === 'media-extras' && visibleTab === 'extras' && launchableSelectionIndex === index}
                onClick={() => onLaunchCard(extra, index)}
                onHover={() => onHoverCard(index)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="p-12 bg-[#0f1922]/40 rounded-xl border border-[#2a475e]/30 text-center italic text-gray-500">
          No alternate versions are available for this title.
        </div>
      )}
    </div>
  );
}
