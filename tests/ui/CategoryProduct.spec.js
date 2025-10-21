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
  await page.getByRole("textbox", { name: "write a name" }).fill("Shoes");
  await page
    .getByRole("textbox", { name: "write a description" })
    .fill("Trendy shoes for any occasion.");
  await page.getByPlaceholder("write a price").fill("155.99");
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
  await expect(page.getByRole("link", { name: "Shoes" }).first()).toBeVisible();

  // Create product 2
  await page.goto("http://localhost:3000/dashboard/admin/create-product");
  await page
    .locator("div")
    .filter({ hasText: /^Select category$/ })
    .first()
    .click();
  await page.getByText("Electronics").nth(1).click();
  await page.getByRole("textbox", { name: "write a name" }).fill("Switch");
  await page
    .getByRole("textbox", { name: "write a description" })
    .fill("Beautiful skirt for any occasion.");
  await page.getByPlaceholder("write a price").fill("666.99");
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
    page.getByRole("link", { name: "Switch" }).first()
  ).toBeVisible();

  // Create product 3
  await page.goto("http://localhost:3000/dashboard/admin/create-product");
  await page
    .locator("div")
    .filter({ hasText: /^Select category$/ })
    .first()
    .click();
  await page.getByText("Book").nth(1).click();
  await page.getByRole("textbox", { name: "write a name" }).fill("TFIOS");
  await page
    .getByRole("textbox", { name: "write a description" })
    .fill("Beautiful skirt for any occasion.");
  await page.getByPlaceholder("write a price").fill("22.99");
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
  await expect(page.getByRole("link", { name: "TFIOS" }).first()).toBeVisible();
});

test.describe("CategoryProduct Page", () => {
  // Test Case 1: view created products for each category
  test("should be able to view products for each category", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000/");
    await page.getByRole("link", { name: "Categories" }).click();
    await page.getByRole("link", { name: "Electronics" }).click();
    await page.waitForTimeout(5000);
    await expect(
      page.getByRole("heading", { name: "Category - Electronics" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Switch" })).toBeVisible();

    await page.getByRole("link", { name: "Categories" }).click();
    await page.getByRole("link", { name: "Book" }).click();
    await page.waitForTimeout(5000);
    await expect(
      page.getByRole("heading", { name: "Category - Book" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "TFIOS" })).toBeVisible();

    await page.getByRole("link", { name: "Categories" }).click();
    await page.getByRole("link", { name: "Clothing" }).click();
    await page.waitForTimeout(5000);
    await expect(
      page.getByRole("heading", { name: "Category - Clothing" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Shoes" })).toBeVisible();
  });
});
