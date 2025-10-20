import { test, expect } from "@playwright/test";

const REGISTER_URL = "http://localhost:3000/register";
const LOGIN_URL = "http://localhost:3000/login";
const HOME_URL = "http://localhost:3000/";
const API_REGISTER = "**/api/v1/auth/register";
const API_LOGIN = "**/api/v1/auth/login";

test("Register → Login → Home (happy path)", async ({ page }) => {
    // Mock backend
    await page.route(API_REGISTER, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, message: "Register Successfully, please login" }),
        });
    });
    await page.route(API_LOGIN, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                success: true,
                message: "Login successful",
                user: { id: 1, name: "Alice" },
                token: "fake-jwt",
            }),
        });
    });

    // 1) Go to Register and submit valid details
    await page.goto(REGISTER_URL);
    await page.fill("#exampleInputName1", "Alice");
    await page.fill("#exampleInputEmail1", "alice@example.com");
    await page.fill("#exampleInputPassword1", "secret123"); // >= 6 chars
    await page.fill("#exampleInputPhone1", "12345678");
    await page.fill("#exampleInputaddress1", "1 Test Street");
    await page.fill("#exampleInputDOB1", "2000-01-01");
    await page.fill("#exampleInputanswer1", "Tennis");
    await page.getByRole("button", { name: "REGISTER" }).click();

    // Optional: toast appears
    await expect(page.getByText("Register Successfully, please login")).toBeVisible();

    // Assert redirect to Login
    await page.waitForURL(LOGIN_URL);

    // 2) Login and assert redirect to Home
    await page.fill('input[type="email"]#exampleInputEmail1', "alice@example.com");
    await page.fill('input[type="password"]#exampleInputPassword1', "secret123");
    await page.getByRole("button", { name: "LOGIN" }).click();

    // Assert redirect to Home ("/")
    await page.waitForURL(HOME_URL);
});