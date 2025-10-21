// tests/register-login-home.e2e.spec.ts
import { test, expect } from "@playwright/test";

const ROOT_FALLBACK = "http://localhost:3000";
const PATH_REGISTER = "/register";
const PATH_LOGIN = "/login";
const PATH_HOME = "/";

// Generate a fresh, valid email each run
function genUniqueEmail(prefix = "e2e") {
    const stamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${stamp}_${rand}@example.com`;
}

test("Register → Login → Home", async ({ page, baseURL }) => {
    const root = baseURL || ROOT_FALLBACK;
    const email = genUniqueEmail("ok");
    const password = "secret123"; // ≥ 6 chars to pass client validation

    // 1) Register with unique email
    await page.goto(`${root}${PATH_REGISTER}`);

    await page.fill("#exampleInputName1", "Alice E2E");
    await page.fill("#exampleInputEmail1", email);
    await page.fill("#exampleInputPassword1", password);
    await page.fill("#exampleInputPhone1", "81234567");
    await page.fill("#exampleInputaddress1", "1 Test Street");
    await page.fill("#exampleInputDOB1", "2000-01-01");
    await page.fill("#exampleInputanswer1", "Badminton");

    await page.getByRole("button", { name: "REGISTER" }).click();

    // Success toast from component, then navigate('/login')
    await expect(page.getByText(/register successfully, please login/i)).toBeVisible({ timeout: 15000 });
    await page.waitForURL(`${root}${PATH_LOGIN}`, { timeout: 15000 });

    // 2) Login with the same freshly-registered credentials
    await expect(page.getByText(/login form/i)).toBeVisible();
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.getByRole("button", { name: "LOGIN" }).click();

    // 3) Assert redirect to Home ("/")
    await page.waitForURL(`${root}${PATH_HOME}`, { timeout: 15000 });
});
