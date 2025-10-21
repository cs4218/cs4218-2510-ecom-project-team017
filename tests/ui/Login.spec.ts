// tests/login.spec.ts
import { test, expect } from "@playwright/test";

const PATH_LOGIN = "/login";
const ROOT_FALLBACK = "http://localhost:3000";

// Optional env for success-path login
const OK_EMAIL = "renjing@nus.edu";
const OK_PASS = "PasswordNew";
const AFTER_LOGIN_PATH = "/";

test.describe("Login page", () => {
  test("renders inputs, buttons, and text correctly", async ({ page, baseURL }) => {
    const root = baseURL || ROOT_FALLBACK;
    await page.goto(`${root}${PATH_LOGIN}`);

    await expect(page.getByText(/login form/i)).toBeVisible();

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    await expect(page.getByRole("button", { name: "LOGIN" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Forgot Password" })).toBeVisible();
  });

  test("shows error toast on invalid login (401 from real backend)", async ({ page, baseURL }) => {
    const root = baseURL || ROOT_FALLBACK;
    await page.goto(`${root}${PATH_LOGIN}`);

    // Use clearly invalid creds to provoke a real 401 from server
    await page.fill('input[type="email"]', "nonexistent_user_401@example.com");
    await page.fill('input[type="password"]', "totallyWrongPassword!");
    await page.getByRole("button", { name: "LOGIN" }).click();

    // Loading state (if your button changes)
    await expect(page.getByRole("button", { name: /logging in/i })).toBeVisible({ timeout: 5000 }).catch(() => { });

    // Expect any of the server/UI surfaced messages
    await expect(
      page.getByText(/invalid email or password|login failed|unauthorized|invalid credentials/i)
    ).toBeVisible({ timeout: 10_000 });

    await expect(page).toHaveURL(new RegExp(`${PATH_LOGIN}$`));
  });

  test("logs in successfully and redirects", async ({ page, baseURL }) => {
    const root = baseURL || ROOT_FALLBACK;
    await page.goto(`${root}${PATH_LOGIN}`);

    await page.fill('input[type="email"]', OK_EMAIL);
    await page.fill('input[type="password"]', OK_PASS);
    await page.getByRole("button", { name: "LOGIN" }).click();

    // Optional loading state
    await expect(page.getByRole("button", { name: /logging in/i })).toBeVisible({ timeout: 5000 }).catch(() => { });

    // Wait until we are no longer on /login
    await page.waitForFunction(() => !location.pathname.endsWith("/login"), null, { timeout: 10_000 });

    // Optionally, assert we reached the expected page (configurable)
    // If your app lands somewhere else, set E2E_AFTER_LOGIN_PATH
    await expect(page).toHaveURL(new RegExp(`${AFTER_LOGIN_PATH.replace("/", "\\/")}`));
  });
});
