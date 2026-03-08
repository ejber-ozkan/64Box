import { expect, test, describe } from 'vitest';
import { sortGames } from './sorting';
import { mockGames } from '../data/mockGames';

describe('sorting logic', () => {
  test('sort by name ascending (alphabetical)', () => {
    const sorted = sortGames(mockGames, 'name', 'asc');
    expect(sorted[0].name).toBe('Archon: The Light and the Dark');
    expect(sorted[1].name).toBe('Boulder Dash');
  });

  test('sort by name descending', () => {
    const sorted = sortGames(mockGames, 'name', 'desc');
    expect(sorted[0].name).toBe('Unknown Game');
    expect(sorted[1].name).toBe('Commando');
  });

  test('sort by year (nulls sink to bottom)', () => {
    const sorted = sortGames(mockGames, 'year', 'asc');
    expect(sorted[0].year).toBe(1983);
    expect(sorted[1].year).toBe(1984);
    expect(sorted[3].year).toBe(null); // sinks
  });
});
