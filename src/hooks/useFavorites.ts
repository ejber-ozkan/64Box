"use client";

import { useState } from 'react';

const FAV_KEY = 'gb64_favorites';

function loadFavorites(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const saved = localStorage.getItem(FAV_KEY);
    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);

  const toggleFavorite = (gameId: string) => {
    setFavorites(prev => {
      const isFav = prev.includes(gameId);
      const next = isFav ? prev.filter(id => id !== gameId) : [...prev, gameId];
      if (typeof window !== 'undefined') {
        localStorage.setItem(FAV_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const isFavorite = (gameId: string) => favorites.includes(gameId);

  return { favorites, toggleFavorite, isFavorite };
}
