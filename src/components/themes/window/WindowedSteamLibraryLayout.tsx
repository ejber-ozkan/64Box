"use client";

import type { DetailLayoutProps } from '../../DetailView';
import { WindowedDetailLayout } from './WindowedDetailLayout';

export function WindowedSteamLibraryLayout(props: DetailLayoutProps) {
  return (
    <WindowedDetailLayout
      {...props}
      palette={{
        accentPanel: 'border-[#66c0f4]/25 bg-[#66c0f4]/10',
        accentText: 'text-[#9ad8ff]',
        background: 'bg-[radial-gradient(circle_at_top,rgba(102,192,244,0.08),transparent_45%),#101822]',
        favoriteButton: 'border-pink-300/30 bg-pink-400/10 text-pink-100',
        surface: 'border-[#2a475e]/70 bg-[#1b2838]/95',
      }}
    />
  );
}
