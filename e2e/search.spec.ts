import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('filters game list based on search query', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search games/i);
    await searchInput.fill('Commando');
    
    // Wait for debounce and search results
    await expect(page.getByText('Commando')).toBeVisible();
    await expect(page.getByText('Archon')).not.toBeVisible();
  });

  test('clearing search restores the list', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search games/i);
    await searchInput.fill('Commando');
    await expect(page.getByText('Archon')).not.toBeVisible();
    
    await searchInput.fill('');
    await expect(page.getByText('Archon')).toBeVisible();
  });
});
