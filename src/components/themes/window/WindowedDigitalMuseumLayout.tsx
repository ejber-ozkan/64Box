"use client";

import type { DetailLayoutProps } from '../../DetailView';
import { WindowedDetailLayout } from './WindowedDetailLayout';

export function WindowedDigitalMuseumLayout(props: DetailLayoutProps) {
  return (
    <WindowedDetailLayout
      {...props}
      palette={{
        accentPanel: 'border-yellow-400/25 bg-yellow-400/10',
        accentText: 'text-yellow-300',
        background: 'bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.08),transparent_45%),#06080d]',
        favoriteButton: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-200',
        surface: 'border-white/8 bg-[#121721]/95',
      }}
    />
  );
}
