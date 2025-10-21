import { test, expect } from "@playwright/test";

const FORGOT_URL = "http://localhost:3000/forgot-password";
const API_FORGOT = "**/api/v1/auth/forgot-password";

test.describe("Forgot Password page", () => {
    test("renders inputs and buttons", async ({ page }) => {
        await page.goto(FORGOT_URL);

        await expect(page.getByText("FORGOT PASSWORD FORM")).toBeVisible();

        await expect(page.locator('#exampleInputEmail1')).toBeVisible();
        await expect(page.locator('#exampleInputAnswer1')).toBeVisible();
        await expect(page.locator('#exampleInputNewPassword1')).toBeVisible();

        await expect(page.getByRole("button", { name: "RESET PASSWORD" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Back to Login" })).toBeVisible();
    });

    test("shows loading state while submitting", async ({ page }) => {
        await page.route(API_FORGOT, async (route) => {
            await new Promise((r) => setTimeout(r, 500));
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ success: true, message: "Password reset successful" }),
            });
        });

        await page.goto(FORGOT_URL);

        await page.fill('#exampleInputEmail1', "alice@example.com");
        await page.fill('#exampleInputAnswer1', "tennis");
        await page.fill('#exampleInputNewPassword1', "secret123");

        const submit = page.getByRole("button", { name: "RESET PASSWORD" });
        await submit.click();

        await expect(page.getByRole("button", { name: "RESETTING..." })).toBeVisible();
        await expect(page.locator('#exampleInputEmail1')).toBeDisabled();
        await expect(page.locator('#exampleInputAnswer1')).toBeDisabled();
        await expect(page.locator('#exampleInputNewPassword1')).toBeDisabled();

        await expect(page.getByText("Password reset successful")).toBeVisible();
    });

    test("shows 401 error toast for invalid email or security answer", async ({ page }) => {
        await page.route(API_FORGOT, async (route) => {
            await route.fulfill({
                status: 401,
                contentType: "application/json",
                body: JSON.stringify({ message: "Invalid email or security answer" }),
            });
        });

        await page.goto(FORGOT_URL);

        await page.fill('#exampleInputEmail1', "bob@example.com");
        await page.fill('#exampleInputAnswer1', "wrong");
        await page.fill('#exampleInputNewPassword1', "secret123");

        await page.getByRole("button", { name: "RESET PASSWORD" }).click();

        await expect(page.getByText("Invalid email or security answer")).toBeVisible();
    });

    test("shows network error toast when request is aborted", async ({ page }) => {
        await page.route(API_FORGOT, (route) => route.abort("failed")); // simulate no response

        await page.goto(FORGOT_URL);

        await page.fill('#exampleInputEmail1', "carol@example.com");
        await page.fill('#exampleInputAnswer1', "football");
        await page.fill('#exampleInputNewPassword1', "secret123");

        await page.getByRole("button", { name: "RESET PASSWORD" }).click();

        await expect(page.getByText("Network error. Please check your connection.")).toBeVisible();
    });
});
