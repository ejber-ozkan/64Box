import { test, expect } from '@playwright/test';
import { waitForAppReady } from './test-helpers';

test.describe('Platform import routing', () => {
  test('routes an unimported Atari 800 platform to MDB and folder setup', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('gb64_settings', JSON.stringify({
        activePlatformId: 'atari800',
        lastUsedPlatformId: 'atari800',
        platformSettings: {
          atari800: {
            library: {
              platformId: 'atari800',
              importStatus: 'notImported',
              sourceMdbPath: 'E:\\Backups\\RETRO-BACKUPS\\Atari8bit\\Atari 800\\Atari 800 v12.mdb',
              sqliteScope: 'atari800',
              lastImportedAt: null,
              lastImportError: null,
              gameCount: 0,
              active: true,
            },
          },
        },
      }));
    });

    await page.goto('/');
    await waitForAppReady(page);

    await expect(page.getByRole('heading', { name: /Build Your Atari 800 Database/i })).toBeVisible();
    await expect(page.getByText(/Atari 800 v12\.mdb/i)).toBeVisible();
    await expect(page.getByText('Games')).toBeVisible();
    await expect(page.getByText('Music')).toBeVisible();
    await expect(page.getByText('Photos')).toBeVisible();
    await expect(page.getByText('Screenshots')).toBeVisible();
    await expect(page.getByRole('button', { name: /Build Database/i })).toBeEnabled();
  });
});
