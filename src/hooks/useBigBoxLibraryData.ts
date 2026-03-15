"use client";

import { useEffect, useMemo, useState } from 'react';
import { Settings } from '../contexts/SettingsContext';
import { Game } from '../types/game';
import { GameFilters, getDbGames, getGenres } from '../lib/tauri-bridge';

export const BIGBOX_LETTERS = ['#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'] as const;

export type BigBoxRailCategory = {
  id: string;
  title: string;
  games: Game[];
  type: 'recent' | 'favorites' | 'classics' | 'alphabet';
  scale?: 'large' | 'normal';
  letter?: string;
};

interface UseBigBoxLibraryDataProps {
  activeRailIndex: number;
  favorites: string[];
  filters: GameFilters;
  recentlyPlayedIds: Settings['recentlyPlayedIds'];
  searchInput: string;
}

export function useBigBoxLibraryData({
  activeRailIndex,
  favorites,
  filters,
  recentlyPlayedIds,
  searchInput,
}: UseBigBoxLibraryDataProps) {
  const [genres, setGenres] = useState<string[]>([]);
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [favoriteGames, setFavoriteGames] = useState<Game[]>([]);
  const [classicGames, setClassicGames] = useState<Game[]>([]);
  const [alphabetRails, setAlphabetRails] = useState<BigBoxRailCategory[]>([]);
  const [totalGameCount, setTotalGameCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGenres().then(setGenres);
  }, []);

  useEffect(() => {
    async function initData() {
      setLoading(true);
      try {
        const query = searchInput || undefined;
        setTotalGameCount(30000);

        if (recentlyPlayedIds.length > 0) {
          const recent = await getDbGames(100, 0, { ...filters, favoriteIds: recentlyPlayedIds, searchQuery: query });
          const sortedRecent = recentlyPlayedIds
            .map((id) => recent.find((game) => game.id.toString() === id))
            .filter((game): game is Game => Boolean(game));
          setRecentGames(sortedRecent);
        } else {
          setRecentGames([]);
        }

        if (favorites.length > 0) {
          const favoriteResults = await getDbGames(100, 0, { ...filters, favoriteIds: favorites, searchQuery: query });
          setFavoriteGames(favoriteResults);
        } else {
          setFavoriteGames([]);
        }

        const classics = await getDbGames(100, 0, { ...filters, isClassic: true, searchQuery: query });
        setClassicGames(classics);

        if (!query) {
          setAlphabetRails(
            BIGBOX_LETTERS.map((letter) => ({
              id: `alpha-${letter}`,
              title: letter === '#' ? '0-9 & Symbols' : `Letter ${letter}`,
              games: [],
              type: 'alphabet',
              letter,
            }))
          );
        } else {
          const results = await getDbGames(500, 0, { ...filters, searchQuery: query });
          setAlphabetRails([
            {
              id: 'search-results',
              title: `Results for "${query}"`,
              games: results,
              type: 'alphabet',
            },
          ]);
        }
      } catch (error) {
        console.error('BigBox init error:', error);
      } finally {
        setLoading(false);
      }
    }

    void initData();
  }, [favorites, filters, recentlyPlayedIds, searchInput]);

  const rails = useMemo<BigBoxRailCategory[]>(() => {
    if (searchInput) {
      return [...alphabetRails];
    }

    const nextRails: BigBoxRailCategory[] = [];
    if (recentGames.length > 0) nextRails.push({ id: 'recent', title: 'Recent Games', games: recentGames, type: 'recent', scale: 'large' });
    if (favoriteGames.length > 0) nextRails.push({ id: 'favorites', title: 'Your Favorites', games: favoriteGames, type: 'favorites' });
    if (classicGames.length > 0) nextRails.push({ id: 'classics', title: '🏆 Legendary Classics 🏆', games: classicGames, type: 'classics' });
    nextRails.push(...alphabetRails);
    return nextRails;
  }, [alphabetRails, classicGames, favoriteGames, recentGames, searchInput]);

  useEffect(() => {
    if (activeRailIndex === -1 || alphabetRails.length === 0) {
      return;
    }

    const currentRail = rails[activeRailIndex];
    if (!currentRail || currentRail.type !== 'alphabet' || currentRail.games.length > 0 || !currentRail.letter) {
      return;
    }

    async function loadRailGames(railId: string, letter: string) {
      try {
        const games = await getDbGames(1000, 0, { ...filters, letter, searchQuery: searchInput || undefined });
        setAlphabetRails((previous) => previous.map((rail) => (rail.id === railId ? { ...rail, games } : rail)));
      } catch (error) {
        console.error(`Failed to lazy load ${letter}:`, error);
      }
    }

    void loadRailGames(currentRail.id, currentRail.letter);
  }, [activeRailIndex, alphabetRails.length, filters, rails, searchInput]);

  return {
    genres,
    loading,
    rails,
    totalGameCount,
  };
}
