import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display dashboard title', async ({ page }) => {
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('should display navigation items', async ({ page }) => {
    await expect(page.getByText('ダッシュボード')).toBeVisible();
    await expect(page.getByText('タイムライン')).toBeVisible();
    await expect(page.getByText('行動ストーリー')).toBeVisible();
    await expect(page.getByText('インサイト')).toBeVisible();
  });

  test('should navigate to timeline', async ({ page }) => {
    await page.click('text=タイムライン');
    await expect(page).toHaveURL(/.*timeline/);
  });

  test('should navigate to settings', async ({ page }) => {
    await page.click('text=設定');
    await expect(page).toHaveURL(/.*settings/);
  });

  test('should switch language', async ({ page }) => {
    await page.click('text=English');
    await expect(page.getByText('Dashboard')).toBeVisible();
    await page.click('text=日本語');
    await expect(page.getByText('ダッシュボード')).toBeVisible();
  });
});
