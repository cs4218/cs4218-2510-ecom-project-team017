import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

test.describe("Profile Update Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.getByRole("textbox", { name: "Enter Your Email" }).click();
    await page
      .getByRole("textbox", { name: "Enter Your Email" })
      .fill("cs4218@test.com");
    await page.getByRole("textbox", { name: "Enter Your Password" }).click();
    await page
      .getByRole("textbox", { name: "Enter Your Password" })
      .fill("cs4218@test.com");
    await page.getByRole("button", { name: "LOGIN" }).click();
    await page.waitForURL("http://localhost:3000/");

    await page.getByRole("button", { name: "CS 4218 Test Account" }).click();
    await page.getByRole("link", { name: "Dashboard" }).click();
    await page.getByRole("link", { name: "Profile" }).click();
  });

  test("should display profile form with correct elements", async ({
    page,
  }) => {
    await expect(page.locator("h4.title")).toHaveText("USER PROFILE");
    await expect(page.getByPlaceholder("Enter Your Name")).toBeVisible();
    await expect(page.getByPlaceholder("Enter Your Email")).toBeVisible();
    await expect(page.getByPlaceholder("Enter Your Password")).toBeVisible();
    await expect(page.getByPlaceholder("Enter Your Phone")).toBeVisible();
    await expect(page.getByPlaceholder("Enter Your Address")).toBeVisible();

    // UPDATE button is present
    await expect(page.getByRole("button", { name: "UPDATE" })).toBeVisible();

    // Email field is disabled
    await expect(page.getByPlaceholder("Enter Your Email")).toBeDisabled();
  });

  test("should prefill form with existing user data", async ({ page }) => {
    await expect(page.getByPlaceholder("Enter Your Name")).toHaveValue(
      "CS 4218 Test Account"
    );
    await expect(page.getByPlaceholder("Enter Your Email")).toHaveValue(
      "cs4218@test.com"
    );
    await expect(page.getByPlaceholder("Enter Your Phone")).toHaveValue(
      "81234567"
    );
    await expect(page.getByPlaceholder("Enter Your Address")).toHaveValue(
      "1 Computing Drive"
    );

    // Password field should be empty
    await expect(page.getByPlaceholder("Enter Your Password")).toHaveValue("");
  });

  test("should return error if password length < 6", async ({ page }) => {
    await page.getByPlaceholder("Enter Your Password").click();
    await page.getByPlaceholder("Enter Your Password").fill("123");
    await page.getByRole("button", { name: "UPDATE" }).click();

    // Check for error toast
    await expect(
      page
        .locator("div")
        .filter({
          hasText: "Password is required and should be at least 6 characters",
        })
        .nth(4)
    ).toBeVisible();
  });

  test("should update profile if password length >= 6", async ({ page }) => {
    // Test with exactly 6 characters
    await page.getByPlaceholder("Enter Your Password").click();
    await page.getByPlaceholder("Enter Your Password").fill("123456");
    await page.getByRole("button", { name: "UPDATE" }).click();
    await expect(
      page
        .locator("div")
        .filter({ hasText: "Profile Updated Successfully" })
        .nth(4)
    ).toBeVisible();

    // Test with more than 6 characters
    await page.getByPlaceholder("Enter Your Password").click();
    await page.getByPlaceholder("Enter Your Password").fill("123456789abcdef");
    await page.getByRole("button", { name: "UPDATE" }).click();
    await expect(
      page
        .locator("div")
        .filter({ hasText: "Profile Updated Successfully" })
        .nth(4)
    ).toBeVisible();

    // Test with a complex password
    await page.getByPlaceholder("Enter Your Password").click();
    await page.getByPlaceholder("Enter Your Password").fill("cs4218@test.com");
    await page.getByRole("button", { name: "UPDATE" }).click();
    await expect(
      page
        .locator("div")
        .filter({ hasText: "Profile Updated Successfully" })
        .nth(4)
    ).toBeVisible();
  });

  test("should show and allow editing of all profile fields", async ({
    page,
  }) => {
    const nameBox = page.getByPlaceholder("Enter Your Name");
    const phoneBox = page.getByPlaceholder("Enter Your Phone");
    const addressBox = page.getByPlaceholder("Enter Your Address");
    const passwordBox = page.getByPlaceholder("Enter Your Password");

    await expect(nameBox).toHaveValue(/.+/);
    await expect(phoneBox).toHaveValue(/.+/);
    await expect(addressBox).toHaveValue(/.+/);

    // Update fields
    await nameBox.fill("E2E Tester");
    await phoneBox.fill("91234567");
    await addressBox.fill("NUS COM2 E2E Street");
    await passwordBox.fill("cs4218@test.com");

    await page.getByRole("button", { name: "UPDATE" }).click();
    await expect(
      page
        .locator("div")
        .filter({ hasText: "Profile Updated Successfully" })
        .nth(4)
    ).toBeVisible();

    // Verify the fields are now showing the updated values
    await expect(nameBox).toHaveValue("E2E Tester");
    await expect(phoneBox).toHaveValue("91234567");
    await expect(addressBox).toHaveValue("NUS COM2 E2E Street");

    // Restore original state
    await nameBox.fill("CS 4218 Test Account");
    await phoneBox.fill("81234567");
    await addressBox.fill("1 Computing Drive");
    await passwordBox.fill("cs4218@test.com");

    await page.getByRole("button", { name: "UPDATE" }).click();
    await expect(
      page
        .locator("div")
        .filter({ hasText: "Profile Updated Successfully" })
        .nth(4)
    ).toBeVisible();
  });

  test("should not allow editing email field", async ({ page }) => {
    const emailBox = page.getByPlaceholder("Enter Your Email");

    // Check that email field is disabled
    await expect(emailBox).toBeDisabled();

    // Try to click and verify it's still disabled
    await emailBox.click({ force: true });
    await expect(emailBox).toBeDisabled();
  });

  test("should handle special characters in fields", async ({ page }) => {
    const nameBox = page.getByPlaceholder("Enter Your Name");
    const phoneBox = page.getByPlaceholder("Enter Your Phone");
    const addressBox = page.getByPlaceholder("Enter Your Address");
    const passwordBox = page.getByPlaceholder("Enter Your Password");

    // Update with special characters
    await nameBox.fill("O'Brien Test-User");
    await phoneBox.fill("+65-81234567");
    await addressBox.fill("123 Test St, Apt #4B");
    await passwordBox.fill("P@ssw0rd!123");

    await page.getByRole("button", { name: "UPDATE" }).click();
    await expect(
      page
        .locator("div")
        .filter({ hasText: "Profile Updated Successfully" })
        .nth(4)
    ).toBeVisible();

    // Verify special characters are preserved
    await expect(nameBox).toHaveValue("O'Brien Test-User");
    await expect(phoneBox).toHaveValue("+65-81234567");
    await expect(addressBox).toHaveValue("123 Test St, Apt #4B");

    // Restore
    await nameBox.fill("CS 4218 Test Account");
    await phoneBox.fill("81234567");
    await addressBox.fill("1 Computing Drive");
    await passwordBox.fill("cs4218@test.com");
    await page.getByRole("button", { name: "UPDATE" }).click();
  });

  test("should maintain form state during validation errors", async ({
    page,
  }) => {
    const nameBox = page.getByPlaceholder("Enter Your Name");
    const phoneBox = page.getByPlaceholder("Enter Your Phone");
    const passwordBox = page.getByPlaceholder("Enter Your Password");

    // Fill form with new values
    await nameBox.fill("New Test Name");
    await phoneBox.fill("99999999");
    await passwordBox.fill("123"); // Invalid password

    await page.getByRole("button", { name: "UPDATE" }).click();

    // Check error is shown
    await expect(
      page
        .locator("div")
        .filter({
          hasText: "Password is required and should be at least 6 characters",
        })
        .nth(4)
    ).toBeVisible();

    // Verify form values are maintained after error
    await expect(nameBox).toHaveValue("New Test Name");
    await expect(phoneBox).toHaveValue("99999999");
    await expect(passwordBox).toHaveValue("123");
  });
});
