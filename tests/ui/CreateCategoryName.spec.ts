import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'parallel' });

test.beforeEach(async ({ page }) => {

    // Login to access create categories
    await page.goto('http://localhost:3000/login');
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('test@admin.com');
    await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('test@admin.com');
    await page.getByRole('button', { name: 'LOGIN' }).click();
    await page.getByRole('button', { name: 'test' }).click();

    // Navigate to create categories page
    await page.goto('http://localhost:3000/dashboard/admin/create-category');
});

test.describe('Create Category Name', () => {
    test('Reject addition of category with duplicate name', async ({ page }) => {
        // Add category with duplicate name
        await page.getByRole('textbox', { name: 'Enter new category' }).click();
        await page.getByRole('textbox', { name: 'Enter new category' }).fill('Electronics');
        await page.getByRole('button', { name: 'Submit' }).click();

        await expect(page.getByRole('status')).toContainText('Category already exists');
    });

    test('Rejection of category name containing special characters', async ({ page }) => {
        // Add category name containing special characters
        await page.getByRole('textbox', { name: 'Enter new category' }).click();
        await page.getByRole('textbox', { name: 'Enter new category' }).fill('*');
        await page.getByRole('button', { name: 'Submit' }).click();

        await expect(page.getByRole('status')).toContainText('Category name cannot contain special chararcters');
    });
});