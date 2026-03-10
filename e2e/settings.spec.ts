import { test, expect } from '@playwright/test';

test.describe('Settings Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Open settings modal (assuming there's a button for it)
    await page.getByRole('button', { name: /settings/i }).click();
  });

  test('can navigate scraper tab and see options', async ({ page }) => {
    await page.getByRole('tab', { name: /scrapers/i }).click();
    await expect(page.getByText(/active scraper/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'EmuMovies' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ScreenScraper' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'TheGamesDB' })).toBeVisible();
  });

  test('about tab displays license and core info', async ({ page }) => {
    await page.getByRole('tab', { name: /about/i }).click();
    await expect(page.getByText(/64Box is an open-source/i)).toBeVisible();
    await expect(page.getByText(/GPLv3 License/i)).toBeVisible();
  });
});
