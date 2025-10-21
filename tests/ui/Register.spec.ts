import { test, expect } from "@playwright/test";

const REGISTER_URL = "http://localhost:3000/register";
const API_REGISTER = "**/api/v1/auth/register";

test.describe("Register page", () => {
    test("renders all inputs and the submit button", async ({ page }) => {
        await page.goto(REGISTER_URL);

        await expect(page.getByText("REGISTER FORM")).toBeVisible();

        await expect(page.locator('input[type="text"]#exampleInputName1')).toBeVisible();
        await expect(page.locator('input[type="email"]#exampleInputEmail1')).toBeVisible();
        await expect(page.locator('input[type="password"]#exampleInputPassword1')).toBeVisible();
        await expect(page.locator('input#exampleInputPhone1')).toBeVisible();
        await expect(page.locator('input#exampleInputaddress1')).toBeVisible();
        await expect(page.locator('input[type="date"]#exampleInputDOB1')).toBeVisible();
        await expect(page.locator('input#exampleInputanswer1')).toBeVisible();
        await expect(page.getByRole("button", { name: "REGISTER" })).toBeVisible();
    });

    test("shows inline password validation error for short password", async ({ page }) => {
        await page.goto(REGISTER_URL);

        await page.fill('#exampleInputName1', "Alice");
        await page.fill('#exampleInputEmail1', "alice@example.com");
        await page.fill('#exampleInputPassword1', "12345");
        await page.fill('#exampleInputPhone1', "12345678");
        await page.fill('#exampleInputaddress1', "1 Test Street");
        await page.fill('#exampleInputDOB1', "2000-01-01");
        await page.fill('#exampleInputanswer1', "Tennis");

        await page.getByRole("button", { name: "REGISTER" }).click();

        await expect(page.locator('#exampleInputPassword1')).toHaveClass(/is-invalid/);
    });

    test("successful register shows success toast (no redirect assert)", async ({ page }) => {
        await page.route(API_REGISTER, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ success: true }),
            });
        });

        await page.goto(REGISTER_URL);

        await page.fill('#exampleInputName1', "Bob");
        await page.fill('#exampleInputEmail1', "bob@example.com");
        await page.fill('#exampleInputPassword1', "secret123");
        await page.fill('#exampleInputPhone1', "87654321");
        await page.fill('#exampleInputaddress1', "99 Demo Ave");
        await page.fill('#exampleInputDOB1', "1999-09-09");
        await page.fill('#exampleInputanswer1', "Football");

        await page.getByRole("button", { name: "REGISTER" }).click();

        await expect(page.getByText("Register Successfully, please login")).toBeVisible();
    });
});
