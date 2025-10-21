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
  await page.getByRole("textbox", { name: "write a name" }).fill("Skirt1");
  await page
    .getByRole("textbox", { name: "write a description" })
    .fill("Beautiful skirt for any occasion.");
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
    page.getByRole("link", { name: "Skirt1" }).first()
  ).toBeVisible();

  // Create product 2
  await page.goto("http://localhost:3000/dashboard/admin/create-product");
  await page
    .locator("div")
    .filter({ hasText: /^Select category$/ })
    .first()
    .click();
  await page.getByText("Clothing").nth(1).click();
  await page.getByRole("textbox", { name: "write a name" }).fill("Skirt2");
  await page
    .getByRole("textbox", { name: "write a description" })
    .fill("Beautiful skirt for any occasion.");
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
    page.getByRole("link", { name: "Skirt2" }).first()
  ).toBeVisible();
});

test.describe("ProductDetails Page", () => {
  // Test Case 1: view created products even when not logged in
  test("should be able to view created products", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    await expect(
      page.getByRole("heading", { name: "All Products" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Skirt1" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Skirt2" })).toBeVisible();
  });

  // Test Case 2: navigate to view product details
  test("should be able to navigate to view product details", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000/");
    await expect(
      page.getByRole("heading", { name: "All Products" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Skirt1" })).toBeVisible();
    await page.getByRole("button", { name: "More Details" }).nth(1).click();
    await expect(page).toHaveURL("http://localhost:3000/product/Skirt1");
    await expect(
      page.getByRole("heading", { name: "Product Details" })
    ).toBeVisible();
    await expect(page.getByRole("main")).toContainText("Name : Skirt1");
    await expect(page.getByRole("main")).toContainText(
      "Description : Beautiful skirt for any occasion."
    );
    await expect(page.getByRole("main")).toContainText("Price :$15.99");
    await expect(page.getByRole("main")).toContainText("Category : Clothing");
    await expect(
      page.getByRole("heading", { name: "Product Details" })
    ).toBeVisible();

    await page.goto("http://localhost:3000/");
    await expect(
      page.getByRole("heading", { name: "All Products" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Skirt2" })).toBeVisible();
    await page.getByRole("button", { name: "More Details" }).nth(0).click();
    await expect(page).toHaveURL("http://localhost:3000/product/Skirt2");
    await expect(
      page.getByRole("heading", { name: "Similar Products ➡️" })
    ).toBeVisible();
    await expect(page.getByRole("main")).toContainText("Name : Skirt2");
    await expect(page.getByRole("main")).toContainText(
      "Description : Beautiful skirt for any occasion."
    );
    await expect(page.getByRole("main")).toContainText("Price :$16.99");
    await expect(page.getByRole("main")).toContainText("Category : Clothing");
    await expect(
      page.getByRole("heading", { name: "Similar Products ➡️" })
    ).toBeVisible();
  });
});
