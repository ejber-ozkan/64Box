"use client";

import { SidPlayer } from '../../SidPlayer';
import { StatusRow } from '../../StatusRow';
import { Game } from '../../../types/game';
import { DetailNavigationHook } from '../../../hooks/useDetailNavigation';

interface SteamSidebarProps {
  game: Game;
  nav: DetailNavigationHook;
}

function renderRating(reviewRating: string | null) {
  const rating = parseInt(reviewRating || '0', 10);
  if (rating <= 0) {
    return 'Not Rated';
  }

  const stars = Math.min(5, rating);
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

export function SteamSidebar({ game, nav }: SteamSidebarProps) {
  return (
    <div className="min-w-[320px] flex-1 flex flex-col gap-6">
      <div className="bg-[#0f1922]/80 border border-[#2a475e] rounded p-4 text-sm flex flex-col gap-3">
        <h3 className="uppercase text-[#66c0f4] border-b border-[#2a475e] pb-1 font-semibold">Game Info</h3>
        <div className="grid grid-cols-[100px_1fr] gap-x-1 gap-y-2">
          <span className="text-gray-500 text-xs">Genre:</span> <span className="text-white text-xs">{game.parentGenre}</span>
          <span className="text-gray-500 text-xs">Sub-genre:</span> <span className="text-white text-xs">{game.subGenre}</span>
          <span className="text-gray-500 text-xs">System:</span> <span className="text-white text-xs">{game.isPal && 'PAL'} {game.isNtsc && 'NTSC'}</span>
          <span className="text-gray-500 text-xs">Control:</span> <span className="text-white text-xs">{game.control || 'Joystick'}</span>
          <span className="text-gray-500 text-xs">Players:</span> <span className="text-white text-xs">{game.playersFrom === game.playersTo ? game.playersFrom : `${game.playersFrom}-${game.playersTo}`}</span>
          <span className="text-gray-500 text-xs">Rating:</span> <span className="text-yellow-500 text-xs">{renderRating(game.reviewRating)}</span>
        </div>
      </div>

      <div className="bg-[#0f1922]/80 border border-[#2a475e] rounded p-4 text-sm flex flex-col gap-3">
        <h3 className="uppercase text-[#66c0f4] border-b border-[#2a475e] pb-1 font-semibold">Credits</h3>
        <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1 text-xs">
          {game.coderName && game.coderName !== '(Unknown)' && (
            <>
              <span className="text-gray-500">Coding:</span>
              <span className="text-blue-300 truncate">{game.coderName}</span>
            </>
          )}
          {game.graphicsName && game.graphicsName !== '(Unknown)' && (
            <>
              <span className="text-gray-500">Graphics:</span>
              <span className="text-green-300 truncate">{game.graphicsName}</span>
            </>
          )}
          {game.musician && (
            <>
              <span className="text-gray-500">Music:</span>
              <span className="text-white truncate">{game.musician.name}</span>
            </>
          )}
          {game.versionBy && game.versionBy !== '(None)' && (
            <>
              <span className="text-gray-500">Version By:</span>
              <span className="text-yellow-500/80 truncate">{game.versionBy}</span>
            </>
          )}
        </div>
      </div>

      <div className="bg-[#0f1922]/80 border border-[#2a475e] rounded p-4 text-sm flex flex-col gap-3">
        <h3 className="uppercase text-[#66c0f4] border-b border-[#2a475e] pb-1 font-semibold">Version Details</h3>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Version By:</span>
            <span className="text-yellow-500/80 truncate text-right">{game.versionBy || '---'}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">PAL / NTSC:</span>
            <span className="text-blue-300 font-medium">{game.vPalNtsc || '---'}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Size:</span>
            <span className="text-white">{game.vLength ? `${game.vLength} Blocks` : '---'}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Trainers:</span>
            <span className="text-white">{game.vTrainers || '0'}</span>
          </div>

          <div className="h-px bg-[#2a475e]/50 my-1" />

          <div className="space-y-2">
            <StatusRow label="Loading Screen" value={game.vLoadingScreen} />
            <StatusRow label="High Score Saver" value={game.vHighScoreSaver} />
            <StatusRow label="Included Docs" value={game.vIncludedDocs} />
            <StatusRow label="True Drive Emul" value={game.vTrueDriveEmu} />
          </div>
        </div>
        {game.memo && (
          <div className="mt-2 p-2 bg-black/40 rounded text-[10px] text-gray-400 italic font-mono border-l-2 border-red-500/50">
            {game.memo}
          </div>
        )}
      </div>

      <div
        onMouseEnter={() => nav.hoverZone('sid')}
        className={`bg-[#0f1922]/80 border border-[#2a475e] rounded p-4 flex flex-col gap-3 transition-all ${nav.focusCls('sid')}`}
      >
        <h3 className="uppercase text-[#66c0f4] border-b border-[#2a475e] pb-1 text-sm font-semibold">Soundtrack Module</h3>
        <SidPlayer filename={game.sidFilename} />
      </div>
    </div>
  );
}
