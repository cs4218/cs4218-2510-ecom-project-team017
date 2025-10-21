import { test, expect } from "@playwright/test";

// Use baseURL from playwright.config.ts, or fall back to localhost
const PATH_FORGOT = "/forgot-password";
const PATH_LOGIN = "/login";

// Read test creds from environment (set these before running)
const EMAIL = "renjing@nus.edu";
const ANSWER = "badminton";
const NEWPASS = "PasswordNew";

test.describe("Forgot Password", () => {

    test("resets password and returns to Login", async ({ page, baseURL }) => {
        await page.goto(`${baseURL || "http://localhost:3000"}${PATH_FORGOT}`);

        await page.fill("#exampleInputEmail1", EMAIL);
        await page.fill("#exampleInputAnswer1", ANSWER);
        await page.fill("#exampleInputNewPassword1", NEWPASS);

        await page.getByRole("button", { name: "RESET PASSWORD" }).click();
        await expect(page.getByRole("button", { name: "RESETTING..." })).toBeVisible();

        await expect(page.getByText(/password reset successful/i)).toBeVisible({ timeout: 10_000 });
        await page.waitForURL(`${baseURL || "http://localhost:3000"}${PATH_LOGIN}`, { timeout: 10_000 });
        await expect(page.getByText(/login form/i)).toBeVisible();
    });

    test("shows error when using a wrong security answer", async ({ page, baseURL }) => {
        const root = baseURL || "http://localhost:3000";
        await page.goto(`${root}${PATH_FORGOT}`);

        await page.fill("#exampleInputEmail1", EMAIL);
        await page.fill("#exampleInputAnswer1", "WRONG_ANSWER");
        await page.fill("#exampleInputNewPassword1", "somepass123");

        await page.getByRole("button", { name: "RESET PASSWORD" }).click();

        await expect(page.getByRole("button", { name: "RESETTING..." })).toBeVisible();

        await expect(
            page.getByText(/invalid email or security answer|password reset failed|please fill in all fields/i)
        ).toBeVisible({ timeout: 10_000 });

        await expect(page).toHaveURL(new RegExp(`${PATH_FORGOT}$`));
    });
});
