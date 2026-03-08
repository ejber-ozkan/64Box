"use client";

import { useState, useEffect } from 'react';

const FAV_KEY = 'gb64_favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(FAV_KEY);
        if (saved) setFavorites(JSON.parse(saved));
      } catch {
        setFavorites([]);
      }
    }
  }, []);

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
