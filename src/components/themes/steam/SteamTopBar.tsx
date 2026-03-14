"use client";

interface SteamTopBarProps {
  focusedZone: string;
  lastAction: string;
  zoneLabels: Record<string, string>;
  onBack: () => void;
}

export function SteamTopBar({ focusedZone, lastAction, zoneLabels, onBack }: SteamTopBarProps) {
  return (
    <div className="bg-[#171d24] px-6 py-2 border-b border-[#2a475e]/30 flex justify-between items-center z-30">
      <button
        onClick={onBack}
        className="px-4 py-1.5 bg-[#2a475e] hover:bg-[#66c0f4] hover:text-white rounded-sm text-[#c6d4df] text-sm uppercase transition-colors"
      >
        ← Library
      </button>

      <div className="flex items-center gap-3 text-xs">
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

