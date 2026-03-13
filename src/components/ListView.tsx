import { Game } from '../types/game';
import { useEffect, useRef } from 'react';

interface ListViewProps {
  games: Game[];
  onSelectGame: (game: Game) => void;
  onSort: (column: keyof Game) => void;
  focusedIndex?: number;
  onFocusChange?: (index: number) => void;
}

export function ListView({ games, onSelectGame, onSort, focusedIndex = -1, onFocusChange }: ListViewProps) {
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    if (focusedIndex >= 0 && tbodyRef.current) {
      const child = tbodyRef.current.children[focusedIndex] as HTMLElement;
      if (child) {
        child.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [focusedIndex]);
  return (
    <div className="overflow-x-auto p-4">
      <table className="min-w-full text-left text-sm text-gray-300">
        <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
          <tr>
            <th className="px-4 py-2 cursor-pointer hover:text-white" onClick={() => onSort('name')}>Title</th>
            <th className="px-4 py-2 cursor-pointer hover:text-white" onClick={() => onSort('year')}>Year</th>
            <th className="px-4 py-2 cursor-pointer hover:text-white" onClick={() => onSort('developer')}>Developer</th>
            <th className="px-4 py-2 cursor-pointer hover:text-white" onClick={() => onSort('parentGenre')}>Genre</th>
          </tr>
        </thead>
        <tbody ref={tbodyRef}>
          {games.map((game, index) => {
            const isFocused = focusedIndex === index;
            return (
            <tr
              key={game.id}
              onClick={() => onSelectGame(game)}
              onMouseEnter={() => onFocusChange?.(index)}
              className={`border-b border-gray-700 cursor-pointer transition-colors ${
                isFocused ? 'bg-blue-900/50 outline outline-2 outline-blue-500' : 'hover:bg-gray-600'
              }`}
            >
              <td className="px-4 py-2 font-medium text-white">{game.name}</td>
              <td className="px-4 py-2">{game.year || '-'}</td>
              <td className="px-4 py-2">{game.developer?.name || '-'}</td>
              <td className="px-4 py-2">{game.parentGenre}</td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
