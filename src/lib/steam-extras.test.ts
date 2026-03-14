import { describe, expect, test } from 'vitest';
import {
  buildExtraAbsolutePath,
  getExtraExtension,
  getExtraLaunchLabel,
  getExtraSourceLabel,
  isImageExtra,
  isLaunchableExtra,
  isVideoExtra,
} from './steam-extras';

const tapeExtra = { id: '1', name: 'Original Tape', path: 'Tapes\\TigerHeli.tap', type: 'game' };
const imageExtra = { id: '2', name: 'Cover', path: 'Cover/front.png', type: 'image' };
const videoExtra = { id: '3', name: 'Longplay', path: 'Longplays/clip.mp4', type: 'video' };

describe('steam extras helpers', () => {
  test('builds normalized absolute extras paths', () => {
    expect(buildExtraAbsolutePath('E:\\Extras\\', '\\Cover\\front.png')).toBe('E:/Extras/Cover/front.png');
  });

  test('detects extra types from file extensions', () => {
    expect(getExtraExtension(imageExtra)).toBe('png');
    expect(isImageExtra(imageExtra)).toBe(true);
    expect(isVideoExtra(videoExtra)).toBe(true);
    expect(isVideoExtra(imageExtra)).toBe(false);
  });

  test('derives launch and source labels from folder roots', () => {
    expect(getExtraSourceLabel(tapeExtra)).toBe('Tapes');
    expect(getExtraLaunchLabel(tapeExtra)).toBe('Launch Tape');
    expect(isLaunchableExtra(tapeExtra)).toBe(true);
    expect(isLaunchableExtra(videoExtra)).toBe(false);
  });

  test('covers disk, cart, and default launch labels', () => {
    expect(getExtraLaunchLabel({ id: '4', name: 'Disk', path: 'Disks/game.d64', type: 'game' })).toBe('Launch Disk');
    expect(getExtraLaunchLabel({ id: '5', name: 'Cart', path: 'Carts/game.crt', type: 'game' })).toBe('Launch Cart');
    expect(getExtraLaunchLabel({ id: '6', name: 'Other', path: 'Variants/game.zip', type: 'game' })).toBe('Launch Variant');
  });
});
