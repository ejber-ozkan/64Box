"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { exitApp, type GameFilters } from '../lib/tauri-bridge';
import { useGamepad } from './useGamepad';
import type { Game } from '../types/game';
import type { BigBoxRailCategory } from './useBigBoxLibraryData';
import { BIGBOX_LETTERS } from './useBigBoxLibraryData';

type KeyEventLike = Pick<KeyboardEvent, 'key'>;
type SectionJumpDirection = 'up' | 'down' | null;

interface UseBigBoxNavigationProps {
  activeHeaderItemIndex: number;
  activeHeaderRow: number;
  activeRailIndex: number;
  filters: GameFilters;
  genres: string[];
  isControllerKeyboardOpen: boolean;
  onBack?: () => void;
  onFiltersChange: (filters: GameFilters) => void;
  onFocusSearchInput: () => void;
  onGamepadInput: () => void;
  onGenreSelect?: () => void;
  onLetterJump?: () => void;
  onNavigationMove?: () => void;
  onOpenControllerKeyboard: () => void;
  onSelectGame: (game: Game) => void;
  onShowSettings: () => void;
  railFocusIndices: Record<string, number>;
  rails: BigBoxRailCategory[];
  setActiveHeaderItemIndex: Dispatch<SetStateAction<number>>;
  setActiveHeaderRow: Dispatch<SetStateAction<number>>;
  setActiveRailIndex: Dispatch<SetStateAction<number>>;
  setRailFocusIndices: Dispatch<SetStateAction<Record<string, number>>>;
  toggleFavorite: (gameId: string) => void;
}

export function useBigBoxNavigation({
  activeHeaderItemIndex,
  activeHeaderRow,
  activeRailIndex,
  filters,
  genres,
  isControllerKeyboardOpen,
  onBack,
  onFiltersChange,
  onFocusSearchInput,
  onGamepadInput,
  onGenreSelect,
  onLetterJump,
  onNavigationMove,
  onOpenControllerKeyboard,
  onSelectGame,
  onShowSettings,
  railFocusIndices,
  rails,
  setActiveHeaderItemIndex,
  setActiveHeaderRow,
  setActiveRailIndex,
  setRailFocusIndices,
  toggleFavorite,
}: UseBigBoxNavigationProps) {
  const [sectionJumpDirection, setSectionJumpDirection] = useState<SectionJumpDirection>(null);

  const currentRail = activeRailIndex >= 0 ? rails[activeRailIndex] : null;
  const currentFocusedIndex = currentRail ? (railFocusIndices[currentRail.id] ?? 0) : 0;
  const currentRailId = currentRail?.id ?? null;
  const currentRailType = currentRail?.type ?? null;

  const getGridColumns = useCallback(() => {
    if (typeof window === 'undefined') return 6;
    if (window.innerWidth >= 1536) return 6;
    if (window.innerWidth >= 1280) return 5;
    if (window.innerWidth >= 1024) return 4;
    if (window.innerWidth >= 640) return 2;
    return 1;
  }, []);

  const focusHeader = useCallback((row: number, index: number) => {
    setSectionJumpDirection(null);
    setActiveRailIndex(-1);
    setActiveHeaderRow(row);
    setActiveHeaderItemIndex(index);
  }, [setActiveHeaderItemIndex, setActiveHeaderRow, setActiveRailIndex]);

  const focusSearch = useCallback(() => {
    focusHeader(0, 0);
  }, [focusHeader]);

  const jumpToRail = useCallback((railId: string) => {
    const targetRailIndex = rails.findIndex((rail) => rail.id === railId);
    if (targetRailIndex !== -1) {
      setSectionJumpDirection(null);
      setActiveRailIndex(targetRailIndex);
    }
  }, [rails, setActiveRailIndex]);

  const focusRailItem = useCallback((railIndex: number, railId: string, gameIndex: number) => {
    setSectionJumpDirection(null);
    setActiveRailIndex(railIndex);
    setRailFocusIndices((previous) => ({ ...previous, [railId]: gameIndex }));
  }, [setActiveRailIndex, setRailFocusIndices]);

  const handleKeyDown = useCallback((event: KeyEventLike) => {
    if (isControllerKeyboardOpen) {
      return;
    }

    const isInputFocused = document.activeElement?.tagName === 'INPUT';
    const rowCounts = [3, genres.length, BIGBOX_LETTERS.length];

    if (isInputFocused) {
      if (event.key === 'Escape') {
        (document.activeElement as HTMLElement).blur();
        return;
      }
      if (event.key === 'ArrowDown') {
        (document.activeElement as HTMLElement).blur();
        setActiveHeaderRow(1);
        setActiveHeaderItemIndex(0);
      }
      return;
    }

    const isHeaderActive = activeRailIndex === -1;
    const rail = rails[activeRailIndex];
    const focusedIndex = rail ? (railFocusIndices[rail.id] ?? 0) : 0;
    const isGrid = rail?.type === 'alphabet';
    const columns = getGridColumns();

    if (event.key === 'ArrowDown') {
      if (isHeaderActive) {
        if (activeHeaderRow < 2) {
          onNavigationMove?.();
          setActiveHeaderRow((previous) => previous + 1);
          setActiveHeaderItemIndex(0);
        } else {
          onNavigationMove?.();
          setSectionJumpDirection(null);
          setActiveRailIndex(0);
        }
        return;
      }

      if (isGrid) {
        const nextIndex = focusedIndex + columns;
        if (nextIndex < rail.games.length) {
          onNavigationMove?.();
          setRailFocusIndices((previous) => ({ ...previous, [rail.id]: nextIndex }));
          return;
        }
      }

      const nextRailIndex = activeRailIndex + 1;
      if (nextRailIndex < rails.length) {
        const nextRail = rails[nextRailIndex];
        onNavigationMove?.();
        setSectionJumpDirection('down');
        setRailFocusIndices((previous) => ({ ...previous, [nextRail.id]: 0 }));
        setActiveRailIndex(nextRailIndex);
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      if (isHeaderActive) {
        if (activeHeaderRow > 0) {
          onNavigationMove?.();
          setActiveHeaderRow((previous) => previous - 1);
          setActiveHeaderItemIndex(0);
        }
        return;
      }

      if (isGrid) {
        const nextIndex = focusedIndex - columns;
        if (nextIndex >= 0) {
          onNavigationMove?.();
          setRailFocusIndices((previous) => ({ ...previous, [rail.id]: nextIndex }));
          return;
        }
      }

      const previousRailIndex = activeRailIndex - 1;
      if (previousRailIndex >= 0) {
        const previousRail = rails[previousRailIndex];
        onNavigationMove?.();
        setSectionJumpDirection('up');
        setRailFocusIndices((previous) => ({
          ...previous,
          [previousRail.id]: Math.max(previousRail.games.length - 1, 0),
        }));
        setActiveRailIndex(previousRailIndex);
      } else {
        onNavigationMove?.();
        focusHeader(2, 0);
      }
      return;
    }

    if (event.key === 'ArrowRight') {
      if (isHeaderActive) {
        onNavigationMove?.();
        setActiveHeaderItemIndex((previous) => (previous + 1) % rowCounts[activeHeaderRow]);
      } else if (isGrid) {
        if (focusedIndex < rail.games.length - 1) {
          onNavigationMove?.();
          setRailFocusIndices((previous) => ({ ...previous, [rail.id]: focusedIndex + 1 }));
        }
      } else {
        onNavigationMove?.();
        setRailFocusIndices((previous) => ({
          ...previous,
          [rail.id]: (focusedIndex + 1) % rail.games.length,
        }));
      }
      return;
    }

    if (event.key === 'ArrowLeft') {
      if (isHeaderActive) {
        onNavigationMove?.();
        setActiveHeaderItemIndex(
          (previous) => (previous - 1 + rowCounts[activeHeaderRow]) % rowCounts[activeHeaderRow],
        );
      } else if (isGrid) {
        if (focusedIndex > 0) {
          onNavigationMove?.();
          setRailFocusIndices((previous) => ({ ...previous, [rail.id]: focusedIndex - 1 }));
        }
      } else {
        onNavigationMove?.();
        setRailFocusIndices((previous) => ({
          ...previous,
          [rail.id]: (focusedIndex - 1 + rail.games.length) % rail.games.length,
        }));
      }
      return;
    }

    if (event.key === 'LB_RB_RIGHT') {
      if (isHeaderActive) {
        if (activeHeaderRow < 2) {
          onNavigationMove?.();
          setActiveHeaderRow((previous) => previous + 1);
          setActiveHeaderItemIndex(0);
        } else if (rails.length > 0) {
          onNavigationMove?.();
          setSectionJumpDirection(null);
          setActiveRailIndex(0);
        }
      } else if (activeRailIndex < rails.length - 1) {
        onNavigationMove?.();
        setSectionJumpDirection(null);
        setActiveRailIndex((previous) => previous + 1);
      }
      return;
    }

    if (event.key === 'LB_RB_LEFT') {
      if (isHeaderActive) {
        if (activeHeaderRow > 0) {
          onNavigationMove?.();
          setActiveHeaderRow((previous) => previous - 1);
          setActiveHeaderItemIndex(0);
        }
      } else if (activeRailIndex === 0) {
        onNavigationMove?.();
        focusHeader(2, 0);
      } else {
        onNavigationMove?.();
        setSectionJumpDirection(null);
        setActiveRailIndex((previous) => previous - 1);
      }
      return;
    }

    if (event.key === 'Enter' || event.key === 'a' || event.key === 'A') {
      if (isHeaderActive) {
        if (activeHeaderRow === 0) {
          if (activeHeaderItemIndex === 0) {
            onFocusSearchInput();
          } else if (activeHeaderItemIndex === 1) {
            onShowSettings();
          } else if (activeHeaderItemIndex === 2) {
            exitApp();
          }
        } else if (activeHeaderRow === 1) {
          onGenreSelect?.();
          const genre = genres[activeHeaderItemIndex];
          onFiltersChange({ ...filters, genre: filters.genre === genre ? undefined : genre });
          setSectionJumpDirection(null);
          setActiveRailIndex(0);
        } else if (activeHeaderRow === 2) {
          onLetterJump?.();
          jumpToRail(`alpha-${BIGBOX_LETTERS[activeHeaderItemIndex]}`);
        }
        return;
      }

      const game = rail?.games[focusedIndex];
      if (game) {
        onSelectGame(game);
      }
      return;
    }

    if (event.key === 'f' || event.key === 'F') {
      const game = rail?.games[focusedIndex];
      if (game) {
        toggleFavorite(game.id.toString());
      }
    }
  }, [
    activeHeaderItemIndex,
    activeHeaderRow,
    activeRailIndex,
    filters,
    focusHeader,
    genres,
    getGridColumns,
    jumpToRail,
    onFiltersChange,
    onFocusSearchInput,
    isControllerKeyboardOpen,
    onGenreSelect,
    onSelectGame,
    onShowSettings,
    onLetterJump,
    onNavigationMove,
    rails,
    railFocusIndices,
    setActiveHeaderItemIndex,
    setActiveHeaderRow,
    setActiveRailIndex,
    setRailFocusIndices,
    toggleFavorite,
  ]);

  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      handleKeyDown(event);
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [handleKeyDown]);

  useGamepad({
    onButtonDown: (button) => {
      if (isControllerKeyboardOpen) {
        return;
      }

      onGamepadInput();

      const isSearchSelected =
        activeRailIndex === -1 &&
        activeHeaderRow === 0 &&
        activeHeaderItemIndex === 0 &&
        document.activeElement?.tagName !== 'INPUT';

      if (button === 'DPAD_UP' || button === 'UP') handleKeyDown({ key: 'ArrowUp' });
      if (button === 'DPAD_DOWN' || button === 'DOWN') handleKeyDown({ key: 'ArrowDown' });
      if (button === 'DPAD_LEFT' || button === 'LEFT') handleKeyDown({ key: 'ArrowLeft' });
      if (button === 'DPAD_RIGHT' || button === 'RIGHT') handleKeyDown({ key: 'ArrowRight' });
      if (button === 'LB') handleKeyDown({ key: 'LB_RB_LEFT' });
      if (button === 'RB') handleKeyDown({ key: 'LB_RB_RIGHT' });
      if (button === 'A') {
        if (isSearchSelected) {
          onOpenControllerKeyboard();
        } else {
          handleKeyDown({ key: 'Enter' });
        }
      }
      if (button === 'Y') handleKeyDown({ key: 'F' });
      if (button === 'START') onShowSettings();
      if (button === 'B') {
        if (document.activeElement?.tagName === 'INPUT') {
          (document.activeElement as HTMLElement).blur();
        } else {
          onBack?.();
        }
      }
    },
  });

  return {
    currentFocusedIndex,
    currentRailId,
    currentRailType,
    focusHeader,
    focusRailItem,
    focusSearch,
    handleKeyDown,
    jumpToRail,
    sectionJumpDirection,
    setSectionJumpDirection,
  };
}
