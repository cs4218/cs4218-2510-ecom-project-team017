import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  // Login to access create categories
  await page.goto("http://localhost:3000/login");
  await page.getByRole("link", { name: "Login" }).click();
  await page
    .getByRole("textbox", { name: "Enter Your Email" })
    .fill("test@admin.com");
  await page
    .getByRole("textbox", { name: "Enter Your Password" })
    .fill("test@admin.com");
  await page.getByRole("button", { name: "LOGIN" }).click();
  await page.getByRole("button", { name: "test" }).click();
  await page.getByRole("link", { name: "Dashboard" }).click();
  await page.getByRole("link", { name: "Create Product" }).click();
});

// Test Case 1: Successfully create a product
test.describe("CreateProduct Page", () => {
  test("should create a new product successfully", async ({ page }) => {
    // Fill product form
    await page
      .locator("div")
      .filter({ hasText: /^Select category$/ })
      .first()
      .click();
    await page.getByText("Clothing").nth(1).click();
    await page.getByRole("textbox", { name: "write a name" }).fill("Blouse1");
    await page
      .getByRole("textbox", { name: "write a description" })
      .fill("Formal blouse for any official occasion.");
    await page.getByPlaceholder("write a price").fill("15.99");
    await page.getByPlaceholder("write a quantity").fill("200");
    await page
      .locator("div")
      .filter({ hasText: /^Select shipping$/ })
      .nth(1)
      .click();
    await page.getByText("Yes").click();
    await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

    // Assert navigation and product listing
    await expect(page.getByText("Product created successfully.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "All Products List" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Blouse1" }).first()
    ).toBeVisible();
  });

  // Test Case 2: Missing fields should show error
  test("should show error when any field is missing during product creation", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "CREATE PRODUCT" }).click();
    await expect(page.getByText("Couldn’t create product.")).toBeVisible();

    // Fill fields one by one
    await page
      .locator("div")
      .filter({ hasText: /^Select category$/ })
      .first()
      .click();
    await page.getByText("Clothing").nth(1).click();
    await page.getByRole("button", { name: "CREATE PRODUCT" }).click();
    await expect(
      page.getByText("Couldn’t create product.").nth(0)
    ).toBeVisible();

    await page.getByRole("textbox", { name: "write a name" }).fill("Blouse2");
    await page.getByRole("button", { name: "CREATE PRODUCT" }).click();
    await expect(
      page.getByText("Couldn’t create product.").nth(1)
    ).toBeVisible();

    await page
      .getByRole("textbox", { name: "write a description" })
      .fill("Formal button down for any official occasion.");
    await page.getByRole("button", { name: "CREATE PRODUCT" }).click();
    await expect(
      page.getByText("Couldn’t create product.").nth(2)
    ).toBeVisible();

    await page.getByPlaceholder("write a price").fill("19.99");
    await page.getByRole("button", { name: "CREATE PRODUCT" }).click();
    await expect(
      page.getByText("Couldn’t create product.").nth(3)
    ).toBeVisible();

    await page.getByPlaceholder("write a quantity").fill("150");
    await page.getByRole("button", { name: "CREATE PRODUCT" }).click();
    await expect(
      page.getByText("Couldn’t create product.").nth(4)
    ).toBeVisible();

    await page
      .locator("div")
      .filter({ hasText: /^Select shipping$/ })
      .nth(1)
      .click();
    await page.getByText("Yes").click();

    await page.getByRole("button", { name: "CREATE PRODUCT" }).click();
    await page.waitForResponse("**/api/v1/product/create-product");

    // Assert navigation and product listing
    await expect(page.getByText("Product created successfully.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "All Products List" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Blouse2" }).first()
    ).toBeVisible();
  });
});
