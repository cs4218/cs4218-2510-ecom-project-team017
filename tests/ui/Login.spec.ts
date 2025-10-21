import { test, expect } from "@playwright/test";

const LOGIN_URL = "http://localhost:3000/login";
const API_LOGIN = "**/api/v1/auth/login";

test.describe("Login page", () => {
  test("renders inputs, buttons, and text correctly", async ({ page }) => {
    await page.goto(LOGIN_URL);

    await expect(page.getByText("LOGIN FORM")).toBeVisible();

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    await expect(page.getByRole("button", { name: "LOGIN" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Forgot Password" })).toBeVisible();
  });

  test("shows error toast on invalid login", async ({ page }) => {
    // Mock 401 backend response
    await page.route(API_LOGIN, async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Invalid email or password" }),
      });
    });

    await page.goto(LOGIN_URL);
    await page.fill('input[type="email"]', "bob@example.com");
    await page.fill('input[type="password"]', "wrongpass");

    await page.getByRole("button", { name: "LOGIN" }).click();

    await expect(page.getByText("Invalid email or password")).toBeVisible();
  });
});
