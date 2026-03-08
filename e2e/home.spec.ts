import { test, expect } from '@playwright/test';

test('homepage has title and default Grid View', async ({ page }) => {
  await page.goto('/');

  // Check title
  await expect(page).toHaveTitle(/Create Next App/); // Default NEXT title
  
  // Verify Grid View components
  await expect(page.getByText('Project 64Box')).toBeVisible();
  await expect(page.getByText('Archon: The Light and the Dark')).toBeVisible();
});

test('can switch to List view and sort', async ({ page }) => {
  await page.goto('/');
  
  // Switch to List View
  await page.getByRole('button', { name: 'List' }).click();
  
  // Check List view items render
  await expect(page.getByRole('row', { name: /Boulder Dash/ })).toBeVisible();
  
  // Sort by Year
  await page.getByRole('columnheader', { name: 'Year' }).click();
  
  // A null year game should sink to the bottom if descending or ascending dependent on implementation
});

test('can click a game and open Detail View', async ({ page }) => {
  await page.goto('/');
  
  // Click on Commando
  await page.getByText('Commando').click();
  
  // Check Detail View opens
  await expect(page.getByRole('button', { name: '← Back to Library' })).toBeVisible();
  
  // Check metadata
  await expect(page.getByRole('heading', { name: 'Commando' })).toBeVisible();
  await expect(page.getByText('Rob Hubbard')).toBeVisible();
});
