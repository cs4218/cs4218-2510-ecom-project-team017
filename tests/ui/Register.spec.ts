import { test, expect } from "@playwright/test";

const ROOT_FALLBACK = "http://localhost:3000";
const PATH_REGISTER = "/register";
const PATH_LOGIN = "/login";

// Known existing account to trigger 409
const EXISTING_EMAIL = "renjing@nus.edu";

// Helper: generate fresh email per run
function genUniqueEmail(prefix = "e2e") {
    const stamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${stamp}_${rand}@example.com`;
}

test.describe("Register page (409 duplicate + success + client validation)", () => {
    test("renders all inputs and the REGISTER button", async ({ page, baseURL }) => {
        const root = baseURL || ROOT_FALLBACK;
        await page.goto(`${root}${PATH_REGISTER}`);

        await expect(page.getByText(/register form/i)).toBeVisible();

        await expect(page.locator("#exampleInputName1")).toBeVisible();
        await expect(page.locator("#exampleInputEmail1")).toBeVisible();
        await expect(page.locator("#exampleInputPassword1")).toBeVisible();
        await expect(page.locator("#exampleInputPhone1")).toBeVisible();
        await expect(page.locator("#exampleInputaddress1")).toBeVisible();
        await expect(page.locator("#exampleInputDOB1")).toBeVisible();
        await expect(page.locator("#exampleInputanswer1")).toBeVisible();

        await expect(page.getByRole("button", { name: "REGISTER" })).toBeVisible();
    });

    test("client-side: short password shows inline error and blocks submit", async ({ page, baseURL }) => {
        const root = baseURL || ROOT_FALLBACK;
        await page.goto(`${root}${PATH_REGISTER}`);

        await page.fill("#exampleInputName1", "Alice");
        await page.fill("#exampleInputEmail1", genUniqueEmail("shortpw"));
        await page.fill("#exampleInputPassword1", "12345"); // < 6 chars
        await expect(page.locator("#exampleInputPassword1")).toHaveClass(/is-invalid/);
        await expect(
            page.locator("#exampleInputPassword1 + .invalid-feedback.d-block")
        ).toHaveText(/password must be at least 6 characters long/i);

        await page.fill("#exampleInputPhone1", "12345678");
        await page.fill("#exampleInputaddress1", "1 Test Street");
        await page.fill("#exampleInputDOB1", "2000-01-01");
        await page.fill("#exampleInputanswer1", "Tennis");

        await page.getByRole("button", { name: "REGISTER" }).click();

        await expect(page.locator("#exampleInputPassword1")).toHaveClass(/is-invalid/);
        await expect(page).toHaveURL(new RegExp(`${PATH_REGISTER}$`));
    });

    test("server-side: duplicate email returns 409 → shows 'Email already exists' toast and stays on /register", async ({ page, baseURL }) => {
        const root = baseURL || ROOT_FALLBACK;
        await page.goto(`${root}${PATH_REGISTER}`);

        await page.fill("#exampleInputName1", "Ren Duplicate");
        await page.fill("#exampleInputEmail1", EXISTING_EMAIL);
        await page.fill("#exampleInputPassword1", "secret123");
        await page.fill("#exampleInputPhone1", "81234567");
        await page.fill("#exampleInputaddress1", "2 Existing Lane");
        await page.fill("#exampleInputDOB1", "2001-01-01");
        await page.fill("#exampleInputanswer1", "Badminton");

        await page.getByRole("button", { name: "REGISTER" }).click();

        await expect(page.getByText(/email already exists/i)).toBeVisible({ timeout: 15000 });
        await expect(page).toHaveURL(new RegExp(`${PATH_REGISTER}$`));
    });

    test("successful registration → success toast then navigate('/login')", async ({ page, baseURL }) => {
        const root = baseURL || ROOT_FALLBACK;
        const uniqueEmail = genUniqueEmail("ok");
        await page.goto(`${root}${PATH_REGISTER}`);

        await page.fill("#exampleInputName1", "Bob E2E");
        await page.fill("#exampleInputEmail1", uniqueEmail);
        await page.fill("#exampleInputPassword1", "secret123");
        await page.fill("#exampleInputPhone1", "87654321");
        await page.fill("#exampleInputaddress1", "99 Demo Ave");
        await page.fill("#exampleInputDOB1", "1999-09-09");
        await page.fill("#exampleInputanswer1", "Football");

        await page.getByRole("button", { name: "REGISTER" }).click();

        await expect(
            page.getByText(/register successfully, please login/i)
        ).toBeVisible({ timeout: 15000 });

        await page.waitForURL(new RegExp(`${(baseURL || ROOT_FALLBACK).replace(/[.*+?^${}()|[\]\\]/g, "\\/")}${PATH_LOGIN.replace("/", "\\/")}`), {
            timeout: 15000,
        });

        await expect(page.getByText(/login form/i)).toBeVisible();
    });
});
