"use client";

import type { DetailLayoutProps } from '../../DetailView';
import { WindowedDetailLayout } from './WindowedDetailLayout';

export function WindowedConsoleHeroLayout(props: DetailLayoutProps) {
  return (
    <WindowedDetailLayout
      {...props}
      palette={{
        accentPanel: 'border-cyan-400/25 bg-cyan-400/10',
        accentText: 'text-cyan-200',
        background: 'bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_45%),#05070d]',
        favoriteButton: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100',
        surface: 'border-white/8 bg-[#101722]/95',
      }}
    />
  );
}
