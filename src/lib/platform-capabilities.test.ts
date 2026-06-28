import { describe, expect, test } from 'vitest';
import {
  ATARI800_REFERENCE_MDB_PATH,
  PLATFORM_EMULATOR_PROFILES,
  PLATFORM_PROFILES,
  SUPPORTED_PLATFORMS,
  createDefaultPlatformSettings,
  isPlatformId,
} from './platform-capabilities';

describe('platform-capabilities', () => {
  test('registers C64, Atari 800, and Atari 2600 profiles', () => {
    expect(SUPPORTED_PLATFORMS.map((platform) => platform.id)).toEqual([
      'c64',
      'atari800',
      'atari2600',
    ]);
  });

  test('defines Atari 800 import, media, launch, and emulator capabilities', () => {
    const atari800 = PLATFORM_PROFILES.atari800;

    expect(atari800.status).toBe('available');
    expect(atari800.importStatus).toBe('notImported');
    expect(atari800.folderTypes).toEqual(['games', 'music', 'photos', 'screenshots', 'extras']);
    expect(atari800.mediaCapabilities.music).toBe('sap');
    expect(atari800.defaultEmulatorProfileId).toBe('retroarch-atari800');
    expect(atari800.supportedEmulatorProfileIds).toContain('altirra-atari800');
    expect(atari800.launchExtensions).toEqual(
      expect.arrayContaining(['.atr', '.xex', '.m3u', '.zip']),
    );
    expect(ATARI800_REFERENCE_MDB_PATH).toContain('Atari 800 v12.mdb');
  });

  test('keeps SID and in-app emulation scoped to C64', () => {
    expect(PLATFORM_PROFILES.c64.mediaCapabilities.music).toBe('sid');
    expect(PLATFORM_PROFILES.c64.inAppEmulation).toBe(true);
    expect(PLATFORM_PROFILES.atari800.inAppEmulation).toBe(false);
    expect(PLATFORM_EMULATOR_PROFILES['altirra-atari800'].platformId).toBe('atari800');
  });

  test('creates platform settings from profile defaults', () => {
    const settings = createDefaultPlatformSettings('atari800');

    expect(settings.library.platformId).toBe('atari800');
    expect(settings.library.importStatus).toBe('notImported');
    expect(settings.emulator.preferredEmulatorProfileId).toBe('retroarch-atari800');
    expect(settings.navigation.lastFocusedIndex).toBe(0);
  });

  test('validates known platform identifiers', () => {
    expect(isPlatformId('c64')).toBe(true);
    expect(isPlatformId('atari800')).toBe(true);
    expect(isPlatformId('amiga')).toBe(false);
  });
});
