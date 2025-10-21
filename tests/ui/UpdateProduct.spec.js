import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  // log in
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

  // create a product
  await page.getByRole("button", { name: "Test" }).click();
  await page.getByRole("link", { name: "Dashboard" }).click();
  await page.getByRole("link", { name: "Create Product" }).click();
  await page
    .locator("div")
    .filter({ hasText: /^Select category$/ })
    .first()
    .click();
  await page.getByText("Clothing").nth(1).click();
  await page.getByRole("textbox", { name: "write a name" }).fill("Bottoms");
  await page
    .getByRole("textbox", { name: "write a description" })
    .fill("Formal pants for any official occasion.");
  await page.getByPlaceholder("write a price").fill("15.99");
  await page.getByPlaceholder("write a quantity").fill("200");
  await page
    .locator("div")
    .filter({ hasText: /^Select shipping$/ })
    .nth(1)
    .click();
  await page.getByText("Yes").click();
  await page.getByRole("button", { name: "CREATE PRODUCT" }).click();
  await expect(page.getByText("Product created successfully.")).toBeVisible();
  await page.waitForURL("http://localhost:3000/dashboard/admin/products");
  await expect(
    page.getByRole("heading", { name: "All Products List" })
  ).toBeVisible();
});

test.describe("UpdateProduct Page", () => {
  // Test Case 1: Successfully update a product
  test("should update an existing product successfully", async ({ page }) => {
    await page.getByRole("link", { name: "Bottoms" }).click();

    // Update fields
    await page.getByLabel("category").first().click();
    await page.getByTitle("Clothing").nth(1).click();

    await page.getByRole("textbox", { name: "write a name" }).fill("Shorts");
    await page
      .getByRole("textbox", { name: "write a description" })
      .fill("Formal nice pants for any official occasion.");
    await page.getByPlaceholder("write a price").fill("29.90");
    await page.getByPlaceholder("write a quantity").fill("50");
    await page.getByLabel("shipping").first().click();
    await page.getByTitle("Yes", { exact: true }).click();

    await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();

    // Assert navigation and product listing
    await expect(page.getByText("Product updated successfully.")).toBeVisible();
    await page.waitForURL("http://localhost:3000/dashboard/admin/products");
    await expect(
      page.getByRole("heading", { name: "All Products List" })
    ).toBeVisible();
    await expect(
      page
        .getByRole("link", {
          name: "Shorts",
        })
        .first()
    ).toBeVisible();
  });

  // Test Case 2: Missing fields should show error on update
  test("should show error when any field is missing during product update", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "Bottoms" }).click();
    await page.waitForTimeout(5000);

    // Clear name
    await page.getByRole("textbox", { name: "write a name" }).fill("");
    await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();
    await expect(
      page.getByText("Couldn’t update product.").nth(0)
    ).toBeVisible();

    // Refill name, clear description
    await page.getByRole("textbox", { name: "write a name" }).fill("Trousers");
    await page.getByRole("textbox", { name: "write a description" }).fill("");
    await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();
    await expect(
      page.getByText("Couldn’t update product.").nth(0)
    ).toBeVisible();

    // Refill description, clear price
    await page
      .getByRole("textbox", { name: "write a description" })
      .fill("Updated description text.");
    await page.getByPlaceholder("write a price").fill("");
    await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();
    await expect(
      page.getByText("Couldn’t update product.").nth(0)
    ).toBeVisible();

    // Refill price, clear quantity
    await page.getByPlaceholder("write a price").fill("25.50");
    await page.getByPlaceholder("write a quantity").fill("");
    await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();
    await expect(
      page.getByText("Couldn’t update product.").nth(0)
    ).toBeVisible();

    // Re-select shipping if needed and submit successfully
    await page.getByPlaceholder("write a quantity").fill("20");
    await page.waitForTimeout(5000);
    await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();

    // Assert navigation and product listing
    await expect(page.getByText("Product updated successfully.")).toBeVisible();
    await page.waitForURL("http://localhost:3000/dashboard/admin/products");
    await expect(
      page.getByRole("heading", { name: "All Products List" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Trousers" }).first()
    ).toBeVisible();
  });

  // Test Case 3: Delete product
  test("should delete an existing product successfully", async ({ page }) => {
    await page.getByRole("link", { name: "Bottoms" }).click();
    await page.waitForTimeout(5000);

    page.once("dialog", async (dialog) => {
      console.log(`Dialog message: ${dialog.message()}`);
      await dialog.accept();
    });
    await page.getByRole("button", { name: "DELETE PRODUCT" }).click();

    await expect(page.getByText("Product deleted successfully.")).toBeVisible();
    await page.waitForURL("http://localhost:3000/dashboard/admin/products");
    await expect(
      page.getByRole("heading", { name: "All Products List" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: "Bottoms",
      })
    ).toHaveCount(0);
  });
});
