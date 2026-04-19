import { expect, Page } from '@playwright/test';

export async function waitForAppReady(page: Page) {
  await expect(page.locator('.app-launch-splash')).toBeHidden({ timeout: 15000 });
}
