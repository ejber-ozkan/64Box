import { describe, expect, test } from 'vitest';
import { groupExtras } from './extras';

describe('groupExtras', () => {
  test('groups extras by extension first and then by folder', () => {
    const groups = groupExtras([
      { id: '1', name: 'Cover', path: 'Cover/front.png', type: 'image' },
      { id: '2', name: 'Manual', path: 'Docs/manual.pdf', type: 'doc' },
      { id: '3', name: 'Trailer', path: 'Trailer/clip.mp4', type: 'video' },
      { id: '4', name: 'Tape', path: 'Tapes/game.tap', type: 'game' },
    ]);

    expect(groups.map((group) => group.category)).toEqual(['visual', 'docs', 'media', 'games']);
    expect(groups[0].items[0].name).toBe('Cover');
    expect(groups[3].items[0].name).toBe('Tape');
  });

  test('falls back to documents for unknown extensions and folders', () => {
    const groups = groupExtras([
      { id: '1', name: 'Readme', path: 'Unknown/readme.xyz', type: 'unknown' },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe('docs');
  });

  test('uses folder fallback rules for known folders with unknown extensions', () => {
    const groups = groupExtras([
      { id: '1', name: 'Advert', path: 'Advert/item.custom', type: 'unknown' },
      { id: '2', name: 'Audio', path: 'mp3s/track.custom', type: 'unknown' },
      { id: '3', name: 'Disk', path: 'Disks/game.custom', type: 'unknown' },
    ]);

    expect(groups.map((group) => group.category)).toEqual(['visual', 'media', 'games']);
  });
});
