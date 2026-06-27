"use client";

import { SUPPORTED_PLATFORMS } from '../lib/platform-capabilities';
import type { PlatformId } from '../types/platform';

interface PlatformSwitcherProps {
  activePlatformId: PlatformId;
  onPlatformSelect: (platformId: PlatformId) => void;
}

export function PlatformSwitcher({ activePlatformId, onPlatformSelect }: PlatformSwitcherProps) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/55">
      <span className="text-white/35">Platform</span>
      <select
        aria-label="Active platform"
        className="bg-transparent text-sm font-black tracking-normal text-white outline-none"
        value={activePlatformId}
        onChange={(event) => onPlatformSelect(event.target.value as PlatformId)}
      >
        {SUPPORTED_PLATFORMS.map((platform) => (
          <option key={platform.id} value={platform.id} className="bg-slate-950 text-white">
            {platform.displayName}
          </option>
        ))}
      </select>
    </label>
  );
}
