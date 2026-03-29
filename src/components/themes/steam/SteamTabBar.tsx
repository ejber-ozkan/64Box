"use client";

import { DetailNavigationHook } from '../../../hooks/useDetailNavigation';
import { FullscreenLayoutMetrics } from '../../../hooks/useFullscreenLayoutMetrics';
import { SteamTab } from './useSteamDetailViewModel';

interface SteamTabBarProps {
  extrasCount: number;
  extrasGalleryCount: number;
  extrasGalleryFocused: boolean;
  extrasFocused: boolean;
  hasGalleryExtras: boolean;
  hasLaunchableExtras: boolean;
  layout?: FullscreenLayoutMetrics;
  nav: DetailNavigationHook;
  onSelectTab: (tab: SteamTab) => void;
  visibleTab: SteamTab;
}

function getTabClass(isActive: boolean, isFocused: boolean, compact = false) {
  return `${compact ? 'px-4 py-2 text-base xl:text-lg' : 'px-6 py-3 text-lg xl:text-xl'} cursor-pointer font-medium uppercase transition-all ${
    isFocused ? 'text-white drop-shadow-[0_0_18px_rgba(250,204,21,0.55)]' : ''
  } ${isActive ? 'text-white border-b-2 border-[#66c0f4]' : 'text-gray-500 hover:text-white'}`;
}

export function SteamTabBar({
  extrasCount,
  extrasGalleryCount,
  extrasGalleryFocused,
  extrasFocused,
  hasGalleryExtras,
  hasLaunchableExtras,
  layout,
  nav,
  onSelectTab,
  visibleTab,
}: SteamTabBarProps) {
  const compact = layout?.densityMode === 'compact';

  return (
    <div className="flex gap-1 border-b border-[#2a475e]">
      <div
        onClick={() => onSelectTab('gallery')}
        className={`${compact ? 'px-3 py-2 text-base' : 'px-4 py-2 text-lg'} cursor-pointer font-medium uppercase transition-colors ${
          visibleTab === 'gallery' ? 'text-white border-b-2 border-[#66c0f4]' : 'text-gray-500 hover:text-white'
        }`}
      >
        Gallery
      </div>
      {hasLaunchableExtras && (
        <div
          onClick={() => onSelectTab('extras')}
          onMouseEnter={() => nav.hoverZone('media-extras')}
          className={getTabClass(visibleTab === 'extras', extrasFocused, compact)}
        >
          Extras Alt. ({extrasCount})
        </div>
      )}
      {hasGalleryExtras && (
        <div
          onClick={() => onSelectTab('extras-gallery')}
          onMouseEnter={() => nav.hoverZone('media-extras')}
          className={getTabClass(visibleTab === 'extras-gallery', extrasGalleryFocused, compact)}
        >
          Extras ({extrasGalleryCount})
        </div>
      )}
    </div>
  );
}
