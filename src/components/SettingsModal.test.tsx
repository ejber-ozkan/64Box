import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createDefaultPlatformSettingsMap } from '../lib/platform-capabilities';
import type { Settings } from '../contexts/SettingsContext';
import { SettingsView } from './SettingsModal';

const updateSettings = vi.fn();

vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: currentSettings,
    updateSettings,
  }),
}));

vi.mock('../hooks/useGamepad', () => ({
  useGamepad: vi.fn(),
}));

vi.mock('../hooks/useInputMode', () => ({
  useInputMode: () => ({
    isMouseMode: true,
    onGamepadInput: vi.fn(),
  }),
}));

vi.mock('../lib/ui-sound-effects', () => ({
  playUiSoundEffect: vi.fn(),
}));

function makeSettings(activePlatformId: Settings['activePlatformId']): Settings {
  const platformSettings = createDefaultPlatformSettingsMap();
  platformSettings.atari800.emulator.executablePaths['retroarch-atari800'] = 'C:/RetroArch/retroarch.exe';
  platformSettings.atari800.emulator.corePaths['retroarch-atari800'] = 'C:/RetroArch/cores/atari800_libretro.dll';
  platformSettings.atari800.emulator.executablePaths['altirra-atari800'] = 'C:/Altirra/Altirra64.exe';

  return {
    screenshotsPath: '',
    soundsPath: '',
    musicianPhotosPath: '',
    romsPath: '',
    emulatorPath: '',
    emuMoviesUsername: '',
    emuMoviesPassword: '',
    scrapedMediaPath: '',
    extrasPath: '',
    activeScraper: 'emumovies',
    screenScraperUsername: '',
    screenScraperPassword: '',
    screenScraperDevId: '',
    screenScraperDevPassword: '',
    theGamesDbApiKey: '',
    hideAdultContent: false,
    recentlyPlayedIds: [],
    retroarchPath: '',
    retroarchCorePath: '',
    preferredEmulator: 'vice',
    imageAnimation: 'none',
    imageCycling: true,
    lastSelectedGameId: null,
    lastFocusedIndex: 0,
    lastViewMode: 'grid',
    isFullscreen: false,
    fullscreenDensity: 'auto',
    displayResolution: 'default',
    windowWidth: 1200,
    windowHeight: 800,
    mouseHoverSelection: true,
    scrollNavigation: true,
    menuSoundEffects: false,
    bigBoxAnimateVertical: true,
    confirmFullscreenExit: true,
    lastBigBoxRailId: null,
    lastBigBoxGameId: null,
    activePlatformId,
    lastUsedPlatformId: activePlatformId,
    platformSettings,
  };
}

let currentSettings = makeSettings('c64');

function openLocalPaths() {
  render(<SettingsView onBack={vi.fn()} />);
  fireEvent.click(screen.getByText('📁 Local Paths'));
}

describe('SettingsView platform emulator settings', () => {
  beforeEach(() => {
    updateSettings.mockClear();
  });

  test('hides Atari 800-only Altirra settings while C64 is active', () => {
    currentSettings = makeSettings('c64');

    openLocalPaths();

    expect(screen.queryByText('Altirra Executable (Altirra64.exe)')).toBeNull();
  });

  test('shows Atari 800 RetroArch and Altirra settings while Atari 800 is active', () => {
    currentSettings = makeSettings('atari800');

    openLocalPaths();

    expect(screen.getByText('RetroArch Atari800 Core')).toBeTruthy();
    expect(screen.getByText('Altirra Executable (Altirra64.exe)')).toBeTruthy();
  });
});
