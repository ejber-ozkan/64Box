"use client";

import { forwardRef } from 'react';
import { getExtraLaunchLabel, getExtraSourceLabel } from '../../../lib/steam-extras';
import { Extra } from '../../../types/game';

interface SteamLaunchableExtraCardProps {
  extra: Extra;
  selected: boolean;
  onClick: () => void;
  onHover: () => void;
}

export const SteamLaunchableExtraCard = forwardRef<HTMLButtonElement, SteamLaunchableExtraCardProps>(function SteamLaunchableExtraCard({
  extra,
  selected,
  onClick,
  onHover,
}, ref) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseEnter={onHover}
      className={`group grid min-h-[96px] grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-all ${
        selected
          ? 'border-yellow-300 bg-emerald-500/10 shadow-[0_0_0_2px_rgba(250,204,21,0.7),0_18px_40px_rgba(0,0,0,0.3)]'
          : 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-400/45 hover:bg-emerald-500/10'
      }`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-xl text-emerald-300">
        ▶
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold leading-tight text-white">{extra.name}</p>
        <p className="mt-1 break-words text-[11px] uppercase tracking-[0.2em] text-emerald-200/75">
          {getExtraSourceLabel(extra)} • {getExtraLaunchLabel(extra)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">A / Enter</p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Launch</p>
      </div>
    </button>
  );
});
