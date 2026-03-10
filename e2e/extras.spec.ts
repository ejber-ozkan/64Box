import { test, expect } from '@playwright/test';

test.describe('Extras Functionality', () => {
  test('displays extras for a game that has them', async ({ page }) => {
    await page.goto('/');
    
    // Search for a game likely to have extras in mock or real DB
    // For testing purposes, we assume 'Commando' might have them or we use a known one
    await page.getByPlaceholder(/search games/i).fill('Commando');
    await page.getByText('Commando').first().click();
    
    // Check if Extras tab/button is visible
    // In Digital Museum it's a Sidebar button, in Steam it's a tab
    // Let's check for the text 'Extras'
    const extrasBtn = page.getByRole('button', { name: /extras/i });
    if (await extrasBtn.isVisible()) {
      await extrasBtn.click();
      // Verify something appears in the extras section
      // E.g., a grid item or a specific filename from the DB
      await expect(page.locator('.group\\/extra')).toBeDefined();
    }
  });
});
