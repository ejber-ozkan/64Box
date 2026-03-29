"use client";

import { FullscreenLayoutMetrics } from '../../../hooks/useFullscreenLayoutMetrics';

interface SteamTopBarProps {
  focusedZone: string;
  lastAction: string;
  layout?: FullscreenLayoutMetrics;
  zoneLabels: Record<string, string>;
  onBack: () => void;
}

export function SteamTopBar({ focusedZone, lastAction, layout, zoneLabels, onBack }: SteamTopBarProps) {
  const compact = layout?.densityMode === 'compact';

  return (
    <div className="bg-[#171d24] border-b border-[#2a475e]/30 flex justify-between items-center z-30" style={compact ? { padding: '8px 18px' } : undefined}>
      <button
        onClick={onBack}
        className={`bg-[#2a475e] hover:bg-[#66c0f4] hover:text-white rounded-sm text-[#c6d4df] uppercase transition-colors ${compact ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'}`}
      >
        ← Library
      </button>

      <div className={`flex items-center text-xs ${compact ? 'gap-2' : 'gap-3'}`}>
        <span className="text-[#3d4450] uppercase font-bold text-[10px]">Controller Mode</span>
        <span className="px-3 py-1 bg-[#2a475e] border border-[#66c0f4]/50 text-[#66c0f4] font-bold rounded-sm animate-pulse min-w-[140px] text-center uppercase tracking-tighter">
          {zoneLabels[focusedZone] ?? focusedZone}
        </span>
        <span className="px-3 py-1 bg-black/40 text-gray-500 rounded-sm font-mono text-[9px] min-w-[100px] text-center lowercase border border-white/5">
          {lastAction}
        </span>
        <span className="text-[#3d4450] uppercase font-bold text-[10px] ml-2">B Back</span>
      </div>
    </div>
  );
}

