import { test, expect } from "@playwright/test";

const LOGIN_URL = "http://localhost:3000/login";
const FORGOT_URL = "http://localhost:3000/forgot-password";
const API_FORGOT = "**/api/v1/auth/forgot-password";

test("Login → Forgot Password → back to Login", async ({ page }) => {
    // Mock a successful reset so the page will navigate back to /login
    await page.route(API_FORGOT, async (route) => {
        // small delay so we can see the loading state
        await new Promise((r) => setTimeout(r, 300));
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, message: "Password reset successful" }),
        });
    });

    await page.goto(LOGIN_URL);
    await expect(page.getByText("LOGIN FORM")).toBeVisible();

    await page.getByRole("button", { name: "Forgot Password" }).click();
    await page.waitForURL(FORGOT_URL);
    await expect(page.getByText("FORGOT PASSWORD FORM")).toBeVisible();

    await page.fill("#exampleInputEmail1", "alice@example.com");
    await page.fill("#exampleInputAnswer1", "tennis");
    await page.fill("#exampleInputNewPassword1", "secret123");

    await page.getByRole("button", { name: "RESET PASSWORD" }).click();

    await expect(page.getByRole("button", { name: "RESETTING..." })).toBeVisible();

    await expect(page.getByText("Password reset successful")).toBeVisible();

    await page.waitForURL(LOGIN_URL);
    await expect(page.getByText("LOGIN FORM")).toBeVisible();
});
