import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExtrasDetail, type ExtrasBigscreenNavigation } from './ExtrasDetail';
import { mockGames } from '../data/mockGames';
import type { Extra } from '../types/game';

const mockGetAssetUrl = vi.fn();
const mockLaunchEmulator = vi.fn();
const mockOpenFile = vi.fn();
const mockMarkAsPlayed = vi.fn();

const baseSettings = {
  emulatorPath: '/usr/bin/x64sc',
  extrasPath: 'E:\\Extras\\',
  preferredEmulator: 'vice' as const,
  retroarchCorePath: '',
  retroarchPath: '',
};

let currentSettings = { ...baseSettings };

vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: currentSettings,
    markAsPlayed: mockMarkAsPlayed,
  }),
}));

vi.mock('../hooks/useGamepad', () => ({
  useGamepad: () => {},
}));

vi.mock('../hooks/usePopupOpenSound', () => ({
  usePopupOpenSound: () => {},
}));

vi.mock('../lib/tauri-bridge', () => ({
  getAssetUrl: (...args: unknown[]) => mockGetAssetUrl(...args),
  launchEmulator: (...args: unknown[]) => mockLaunchEmulator(...args),
  openFile: (...args: unknown[]) => mockOpenFile(...args),
}));

const visualExtras: Extra[] = [
  { id: 'visual-1', name: 'Cover One', path: 'Cover\\cover-one.png', type: 'image' },
  { id: 'visual-2', name: 'Cover Two', path: 'Cover\\cover-two.png', type: 'image' },
];

const docsAndMediaExtras: Extra[] = [
  { id: 'doc-1', name: 'Manual', path: 'Docs\\manual.pdf', type: 'doc' },
  { id: 'media-1', name: 'Soundtrack', path: 'mp3s\\theme.mp3', type: 'audio' },
];

const launchableExtra: Extra = {
  id: 'game-1',
  name: 'Original Tape',
  path: '\\Tapes\\original.tap',
  type: 'game',
};

describe('ExtrasDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSettings = { ...baseSettings };
    mockGetAssetUrl.mockImplementation(async (path: string) => `asset://${path.replace(/\\/g, '/')}`);
    mockLaunchEmulator.mockResolvedValue({ success: true, message: '' });
    mockOpenFile.mockResolvedValue(undefined);
  });

  it('normalizes the extras launch path before invoking the emulator', async () => {
    render(<ExtrasDetail game={mockGames[0]} extras={[launchableExtra]} />);

    fireEvent.click(screen.getByRole('button', { name: /original tape/i }));

    await waitFor(() => {
      expect(mockLaunchEmulator).toHaveBeenCalledWith({
        emulator_path: '/usr/bin/x64sc',
        rom_path: 'E:/Extras/Tapes/original.tap',
        true_drive_emulation: false,
        is_pal: true,
        game_id: mockGames[0].id.toString(),
        core_path: undefined,
      });
    });

    expect(mockMarkAsPlayed).toHaveBeenCalledWith(mockGames[0].id.toString());
  });

  it('opens docs and media extras with normalized file paths', async () => {
    render(<ExtrasDetail game={mockGames[0]} extras={docsAndMediaExtras} />);

    fireEvent.click(screen.getByRole('button', { name: /manual/i }));
    fireEvent.click(screen.getByRole('button', { name: /soundtrack/i }));

    await waitFor(() => {
      expect(mockOpenFile).toHaveBeenNthCalledWith(1, 'E:/Extras/Docs/manual.pdf');
      expect(mockOpenFile).toHaveBeenNthCalledWith(2, 'E:/Extras/mp3s/theme.mp3');
    });
  });

  it('registers and unregisters bigscreen navigation when enabled', async () => {
    const onRegisterBigscreenNavigation = vi.fn<(navigation: ExtrasBigscreenNavigation | null) => void>();

    const { unmount } = render(
      <ExtrasDetail
        game={mockGames[0]}
        extras={visualExtras}
        enableBigscreenGalleryUX
        onRegisterBigscreenNavigation={onRegisterBigscreenNavigation}
      />
    );

    await waitFor(() => {
      expect(onRegisterBigscreenNavigation).toHaveBeenCalledWith(
        expect.objectContaining({
          activate: expect.any(Function),
          move: expect.any(Function),
        })
      );
    });

    unmount();

    expect(onRegisterBigscreenNavigation).toHaveBeenLastCalledWith(null);
  });

  it('opens, cycles, and closes fullscreen visual extras in bigscreen gallery mode', async () => {
    render(
      <ExtrasDetail
        game={mockGames[0]}
        extras={visualExtras}
        enableBigscreenGalleryUX
      />
    );

    await screen.findAllByAltText('Cover One');

    const previewButton = screen.getAllByRole('button', { name: /cover one/i })[0];
    fireEvent.click(previewButton);

    await screen.findByText('Cover\\cover-one.png');

    fireEvent.keyDown(window, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(screen.getAllByAltText('Cover Two').length).toBeGreaterThan(1);
    });
    await screen.findByText('Cover\\cover-two.png');

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Cover\\cover-two.png')).toBeNull();
    });
  });

  it('updates the selected preview when a thumbnail is clicked in bigscreen gallery mode', async () => {
    render(
      <ExtrasDetail
        game={mockGames[0]}
        extras={visualExtras}
        enableBigscreenGalleryUX
      />
    );

    await screen.findAllByAltText('Cover One');

    const coverTwoButtons = screen.getAllByRole('button', { name: /cover two/i });
    fireEvent.click(coverTwoButtons[coverTwoButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /cover two/i }).length).toBeGreaterThan(1);
    });
  });
});
