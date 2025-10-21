import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'parallel' });

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000');
});

test.describe('Categories Page', () => {
  test('Categories page loads with link to all categories', async ({ page }) => {
    await page.getByRole('link', { name: 'Categories' }).click();
    await page.getByRole('link', { name: 'All Categories' }).click();

    await expect(page.getByRole('main')).toContainText('Electronics');
    await expect(page.getByRole('main')).toContainText('Book');
    await expect(page.getByRole('main')).toContainText('Clothing');

    await expect(page.getByRole('link', { name: 'Electronics' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Book' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Clothing' })).toBeVisible();
  });

  test('Electronics category page renders the same via both navigation paths', async ({ page }) => {
    // --- First path: Direct click to "Electronics"
    await page.getByRole('link', { name: 'Categories' }).click();
    await page.getByRole('link', { name: 'Electronics' }).click();

    // Capture snapshot of content
    const firstVisit = await page.locator('main').innerHTML();

    // --- Go back to homepage
    await page.goto('http://localhost:3000/');

    // --- Second path: via "All Categories"
    await page.getByRole('link', { name: 'Categories' }).click();
    await page.getByRole('link', { name: 'All Categories' }).click();
    await page.getByRole('link', { name: 'Electronics' }).click();

    // Capture snapshot of content again
    const secondVisit = await page.locator('main').innerHTML();

    // Compare both HTML strings
    expect(secondVisit).toBe(firstVisit);
  });

  test('Book category page renders the same via both navigation paths', async ({ page }) => {
    // --- First path: Direct click to "Book"
    await page.getByRole('link', { name: 'Categories' }).click();
    await page.getByRole('link', { name: 'Book' }).click();

    // Capture snapshot of content
    const firstVisit = await page.locator('main').innerHTML();

    // --- Go back to homepage
    await page.goto('http://localhost:3000/');

    // --- Second path: via "All Categories"
    await page.getByRole('link', { name: 'Categories' }).click();
    await page.getByRole('link', { name: 'All Categories' }).click();
    await page.getByRole('link', { name: 'Book' }).click();

    // Capture snapshot of content again
    const secondVisit = await page.locator('main').innerHTML();

    // Compare both HTML strings
    expect(secondVisit).toBe(firstVisit);
  });

  test('Clothing category page renders the same via both navigation paths', async ({ page }) => {
    // --- First path: Direct click to "Book"
    await page.getByRole('link', { name: 'Categories' }).click();
    await page.getByRole('link', { name: 'Clothing' }).click();

    // Capture snapshot of content
    const firstVisit = await page.locator('main').innerHTML();

    // --- Go back to homepage
    await page.goto('http://localhost:3000/');

    // --- Second path: via "All Categories"
    await page.getByRole('link', { name: 'Categories' }).click();
    await page.getByRole('link', { name: 'All Categories' }).click();
    await page.getByRole('link', { name: 'Clothing' }).click();

    // Capture snapshot of content again
    const secondVisit = await page.locator('main').innerHTML();

    // Compare both HTML strings
    expect(secondVisit).toBe(firstVisit);
  });

});