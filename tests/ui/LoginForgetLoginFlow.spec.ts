// tests/login-forgot-login.e2e.spec.ts
import { test, expect } from "@playwright/test";

const ROOT_FALLBACK = "http://localhost:3000";
const PATH_LOGIN = "/login";
const PATH_FORGOT = "/forgot-password";

// Known working test data in your backend
const EMAIL = "renjing@nus.edu";
const ANSWER = "badminton";
const NEW_PASSWORD = "PasswordNew";

test("Login → Forgot Password → back to Login", async ({ page, baseURL }) => {
    const root = baseURL || ROOT_FALLBACK;

    await page.goto(`${root}${PATH_LOGIN}`);
    await expect(page.getByText(/login form/i)).toBeVisible();

    await page.getByRole("button", { name: /forgot password/i }).click();
    await page.waitForURL(`${root}${PATH_FORGOT}`);
    await expect(page.getByText(/forgot password form/i)).toBeVisible();

    await page.fill("#exampleInputEmail1", EMAIL);
    await page.fill("#exampleInputAnswer1", ANSWER);
    await page.fill("#exampleInputNewPassword1", NEW_PASSWORD);

    await page.getByRole("button", { name: /reset password/i }).click();

    await expect(page.getByRole("button", { name: /resetting\.\.\./i }))
        .toBeVisible({ timeout: 5000 })
        .catch(() => { });

    await expect(
        page.getByText(/password reset successful|password has been reset/i)
    ).toBeVisible({ timeout: 15000 });

    await page.waitForURL(`${root}${PATH_LOGIN}`, { timeout: 15000 });
    await expect(page.getByText(/login form/i)).toBeVisible();
});
