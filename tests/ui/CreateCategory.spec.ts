import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

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

// Tests are run in sequence to prevent errors in CRUD operations
test.describe('Create Categories Page', () => {

    test('Addition of new category', async ({ page }) => {
        // Enter new category name
        await page.getByRole('textbox', { name: 'Enter new category' }).click();
        await page.getByRole('textbox', { name: 'Enter new category' }).fill('New Category');
        await page.getByRole('button', { name: 'Submit' }).click();

        // Expect that new category has been created
        await expect(page.getByRole('status')).toContainText('New Category is created');
        await expect(page.locator('tbody')).toContainText('New Category');
        await expect(page.getByRole('cell', { name: 'New Category' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Edit' }).nth(3)).toBeVisible();
        await expect(page.getByRole('button', { name: 'Delete' }).nth(3)).toBeVisible();
        
        // Expect that new category is reflected in new categories page
        await page.goto('http://localhost:3000/categories');
        await expect(page.getByRole('link', { name: 'New Category' })).toBeVisible();
        await expect(page.getByRole('main')).toContainText('New Category');
    });

    test('Edit category name', async ({ page }) => {
        // Edit name of new category
        await page.getByRole('button', { name: 'Edit' }).nth(3).click();
        await page.getByRole('dialog').getByRole('textbox', { name: 'Enter new category' }).click();
        await page.getByRole('dialog').getByRole('textbox', { name: 'Enter new category' }).fill('Updated Category Name');
        await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();

        // Check that name is updated to 'Updated Category Name'
        await expect(page.getByRole('status')).toContainText('Updated Category Name is updated');
        await expect(page.locator('tbody')).toContainText('Updated Category Name');
        await expect(page.getByRole('cell', { name: 'Updated Category Name' })).toBeVisible();

        // Check that name is updated on the All Categories page
        await page.getByRole('link', { name: 'Categories' }).click();
        await page.getByRole('link', { name: 'All Categories' }).click();
        await expect(page.getByRole('link', { name: 'Updated Category Name' })).toBeVisible();
        await expect(page.getByRole('main')).toContainText('Updated Category Name');
    });

    test('Cancel edit category name', async ({ page }) => {
        // Edit name of new category
        await page.getByRole('button', { name: 'Edit' }).nth(3).click();
        await page.getByRole('dialog').getByRole('textbox', { name: 'Enter new category' }).click();
        await page.getByRole('dialog').getByRole('textbox', { name: 'Enter new category' }).fill('Category Name');
        await page.getByRole('button', { name: 'Close' }).click();

        // Check that name 'Updated Category Name' is not changed
        await expect(page.locator('tbody')).toContainText('Updated Category Name');
        await expect(page.getByRole('cell', { name: 'Updated Category Name' })).toBeVisible();
    });

    test('Delete category', async ({ page }) => {
        // Get the row containing "New Category"
        const row = page.locator('tr', { hasText: 'Updated Category Name' });

        // Delete category wuth name 'Updated Category Name'
        await page.getByRole('button', { name: 'Delete' }).nth(3).click();

        // Wait for the row to be removed (category deleted)
        await expect(page.getByRole('status')).toContainText('Category is deleted');
        await expect(row).not.toBeVisible();

        // Go to Categories page and confirm it's gone
        await page.goto('http://localhost:3000/categories');
        await expect(page.getByRole('main')).not.toContainText('Updated Category Name');
        await expect(page.getByRole('link', { name: 'Updated Category Name' })).toHaveCount(0);
    }); 
});

