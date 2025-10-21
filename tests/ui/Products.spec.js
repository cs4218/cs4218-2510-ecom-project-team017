import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

let context;
let page;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();

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

  // Create product 1
  await page.goto("http://localhost:3000/dashboard/admin/create-product");
  await page
    .locator("div")
    .filter({ hasText: /^Select category$/ })
    .first()
    .click();
  await page.getByText("Clothing").nth(1).click();
  await page.getByRole("textbox", { name: "write a name" }).fill("Shirt1");
  await page
    .getByRole("textbox", { name: "write a description" })
    .fill("Formal shirt for any official occasion.");
  await page.getByPlaceholder("write a price").fill("15.99");
  await page.getByPlaceholder("write a quantity").fill("200");
  await page
    .locator("div")
    .filter({ hasText: /^Select shipping$/ })
    .nth(1)
    .click();
  await page.getByText("Yes").click();
  await page.getByRole("button", { name: "CREATE PRODUCT" }).click();
  await page.waitForURL("http://localhost:3000/dashboard/admin/products");
  await expect(page.getByText("Product created successfully.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "All Products List" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Shirt1" }).first()
  ).toBeVisible();

  // Create product 2
  await page.goto("http://localhost:3000/dashboard/admin/create-product");
  await page
    .locator("div")
    .filter({ hasText: /^Select category$/ })
    .first()
    .click();
  await page.getByText("Clothing").nth(1).click();
  await page.getByRole("textbox", { name: "write a name" }).fill("Shirt2");
  await page
    .getByRole("textbox", { name: "write a description" })
    .fill("Formal shirt for any official occasion.");
  await page.getByPlaceholder("write a price").fill("16.99");
  await page.getByPlaceholder("write a quantity").fill("200");
  await page
    .locator("div")
    .filter({ hasText: /^Select shipping$/ })
    .nth(1)
    .click();
  await page.getByText("Yes").click();
  await page.getByRole("button", { name: "CREATE PRODUCT" }).click();
  await page.waitForURL("http://localhost:3000/dashboard/admin/products");
  await expect(
    page.getByRole("heading", { name: "All Products List" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Shirt2" }).first()
  ).toBeVisible();
});

test.describe("Products Page", () => {
  // Test Case 1: view created products
  test("should be able to view created products", async ({ page }) => {
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

    await page.goto("http://localhost:3000/dashboard/admin/products");
    await expect(
      page.getByRole("heading", { name: "All Products List" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Shirt1" }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Shirt2" }).first()
    ).toBeVisible();
  });

  // Test Case 2: navigate to update created products
  test("should be able to navigate to update created products", async ({
    page,
  }) => {
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

    await page.goto("http://localhost:3000/dashboard/admin/products");
    await expect(
      page.getByRole("heading", { name: "All Products List" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Shirt1" }).first()
    ).toBeVisible();
    await page.getByRole("link", { name: "Shirt1" }).click();
    await expect(page).toHaveURL(
      "http://localhost:3000/dashboard/admin/product/Shirt1"
    );
    await expect(
      page.getByRole("heading", { name: "Update Product" })
    ).toBeVisible();

    await page.goto("http://localhost:3000/dashboard/admin/products");
    await expect(
      page.getByRole("heading", { name: "All Products List" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Shirt2" }).first()
    ).toBeVisible();
    await page.getByRole("link", { name: "Shirt2" }).click();
    await expect(page).toHaveURL(
      "http://localhost:3000/dashboard/admin/product/Shirt2"
    );
    await expect(
      page.getByRole("heading", { name: "Update Product" })
    ).toBeVisible();
  });
});
